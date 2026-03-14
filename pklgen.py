# =====================================================
# PHYSICS-INFORMED GNSS PW ESTIMATION (FINAL + UNIT SAFE)
# Physics vs Spatial IDW vs Physics-Informed XGBoost
# LOSO validation + visualisations + 5-station demo
# =====================================================

import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.spatial.distance import cdist
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

# =====================================================
# GLOBAL PHYSICS SAFETY
# =====================================================

def enforce_physical_pw(pw):
    """PW must be non-negative"""
    return np.clip(pw, 0, None)

# =====================================================
# 1. LOAD & CLEAN DATA
# =====================================================

# df = pd.read_csv("dataset.csv")
df = pd.read_csv("model/dataset.csv")

df["Date (ISO Format)"] = pd.to_datetime(df["Date (ISO Format)"])
df["Hour"] = df["Date (ISO Format)"].dt.hour # type: ignore
df["doy"]  = df["Date (ISO Format)"].dt.dayofyear # type: ignore

# Physical sanity checks
df = df[
    (df["ZWD Observation"] > 0) &
    (df["Temperature (°C)"].between(-50, 60)) &
    (df["Pressure (hPa)"].between(800, 1100)) &
    (df["Humidity (%)"].between(0, 100))
].dropna()

# =====================================================
# 2. PHYSICS: ZWD → PW (Bevis et al.)
# IMPORTANT: ZWD IS IN METERS → CONVERT TO mm
# =====================================================

df["ZWD_mm"] = df["ZWD Observation"] * 1000.0  # meters → millimeters

df["PW_physics_mm"] = (
    (0.15 + 0.0005 * df["Temperature (°C)"]) *
    df["ZWD_mm"]
)

df["PW_physics_mm"] = enforce_physical_pw(df["PW_physics_mm"])

# ---- Sanity check (DO NOT REMOVE) ----
print("\nPW statistics after physics conversion:")
print(df["PW_physics_mm"].describe())

assert df["PW_physics_mm"].mean() > 5, \
    "PW too small → ZWD unit error (meters vs mm)"

# =====================================================
# 3. SIMPLE FEATURE SET (LOW COMPLEXITY)
# =====================================================

features = [
    "Temperature (°C)",
    "Pressure (hPa)",
    "Humidity (%)"
]

# =====================================================
# 4. SPATIAL IDW BASELINE
# =====================================================

def idw(train_xy, train_val, test_xy):
    d = cdist(test_xy, train_xy)
    d = np.maximum(d, 1e-6)
    w = 1 / d**2
    w /= w.sum(axis=1, keepdims=True)
    return w @ train_val

# =====================================================
# 5. LOSO VALIDATION
# =====================================================

stations = df["Station ID"].unique()

rmse_phy, mae_phy, r2_phy = [], [], []
rmse_idw, mae_idw, r2_idw = [], [], []
rmse_ml,  mae_ml,  r2_ml  = [], [], []

for st in stations:

    train = df[df["Station ID"] != st]
    test  = df[df["Station ID"] == st]
    if len(test) == 0:
        continue

    y_true = test["PW_physics_mm"].values

    # ----- Physics-only baseline -----
    phy_pred = np.full(len(test), train["PW_physics_mm"].mean())
    phy_pred = enforce_physical_pw(phy_pred)

    rmse_phy.append(np.sqrt(mean_squared_error(y_true, phy_pred)))
    mae_phy.append(mean_absolute_error(y_true, phy_pred))
    r2_phy.append(max(r2_score(y_true, phy_pred), 0))

    # ----- Spatial IDW baseline -----
    idw_pred = idw(
        train[["Station Longitude", "Station Latitude"]],
        train["PW_physics_mm"],
        test[["Station Longitude", "Station Latitude"]]
    )
    idw_pred = enforce_physical_pw(idw_pred)

    rmse_idw.append(np.sqrt(mean_squared_error(y_true, idw_pred)))
    mae_idw.append(mean_absolute_error(y_true, idw_pred))
    r2_idw.append(max(r2_score(y_true, idw_pred), 0))

    # ----- Physics-Informed ML (residual learning) -----
    baseline = train["PW_physics_mm"].mean()
    train = train.copy()
    train["residual"] = train["PW_physics_mm"] - baseline

    model = XGBRegressor(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.1,
        objective="reg:squarederror",
        random_state=42
    )

    model.fit(train[features], train["residual"])

    ml_pred = test["PW_physics_mm"].values + model.predict(test[features])
    ml_pred = enforce_physical_pw(ml_pred)

    rmse_ml.append(np.sqrt(mean_squared_error(y_true, ml_pred)))
    mae_ml.append(mean_absolute_error(y_true, ml_pred))
    r2_ml.append(max(r2_score(y_true, ml_pred), 0))

    with open("physics_informed_xgb.pkl", "wb") as f:
        pickle.dump(model, f)

    

# =====================================================
# 6. FINAL COMPARISON TABLE
# =====================================================

comparison = pd.DataFrame({
    "Model": ["Physics-Only", "Spatial IDW", "Physics-Informed ML"],
    "RMSE (mm)": [np.mean(rmse_phy), np.mean(rmse_idw), np.mean(rmse_ml)],
    "MAE (mm)":  [np.mean(mae_phy),  np.mean(mae_idw),  np.mean(mae_ml)],
    "R²":        [np.mean(r2_phy),   np.mean(r2_idw),   np.mean(r2_ml)]
})

print("\n=== FINAL MODEL COMPARISON (LOSO) ===")
print(comparison.to_string(index=False))

# =====================================================
# 7. VISUALISATIONS
# =====================================================

fig, axes = plt.subplots(1, 3, figsize=(15, 4))

axes[0].bar(comparison["Model"], comparison["RMSE (mm)"])
axes[0].set_title("RMSE Comparison")
axes[0].set_ylabel("RMSE (mm)")

axes[1].bar(comparison["Model"], comparison["MAE (mm)"])
axes[1].set_title("MAE Comparison")
axes[1].set_ylabel("MAE (mm)")

axes[2].bar(comparison["Model"], comparison["R²"])
axes[2].set_ylim(0, 1)
axes[2].set_title("R² Comparison")

plt.tight_layout()
plt.savefig("pw_model_comparison.png", dpi=300)
plt.show()

# =====================================================
# 8. FIVE-STATION INTERPOLATION DEMO (VIVA)
# =====================================================

def five_station_interpolation_demo(df, target_station_id):

    print("\n==============================")
    print("5-STATION INTERPOLATION DEMO")
    print("==============================")

    target = df[df["Station ID"] == target_station_id].iloc[0]
    others = df[df["Station ID"] != target_station_id].copy()

    others["distance"] = np.sqrt(
        (others["Station Latitude"] - target["Station Latitude"])**2 +
        (others["Station Longitude"] - target["Station Longitude"])**2
    )

    nearest = others.sort_values("distance").head(5)

    print(f"\nTarget Station: {target_station_id}")
    print(f"True PW: {target['PW_physics_mm']:.3f} mm\n")

    for _, row in nearest.iterrows():
        print(
            f"Station {row['Station ID']} | "
            f"Dist={row['distance']:.4f} | "
            f"PW={row['PW_physics_mm']:.3f}"
        )

    weights = 1 / (nearest["distance"] + 1e-6)
    weights /= weights.sum()

    interpolated_pw = np.sum(weights * nearest["PW_physics_mm"])
    interpolated_pw = enforce_physical_pw(interpolated_pw)

    print("\nInterpolated PW:", f"{interpolated_pw:.3f} mm")
    print("Absolute Error :", f"{abs(interpolated_pw - target['PW_physics_mm']):.3f} mm")

# Run demo
example_station = df["Station ID"].iloc[0]
five_station_interpolation_demo(df, example_station)



# =====================================================
# 9. TRAIN FINAL DEPLOYMENT MODEL (ALL DATA)
# =====================================================

print("\nTraining FINAL deployment model on full dataset...")

# Physics baseline
baseline_full = df["PW_physics_mm"].mean()

# Residual learning
df["residual"] = df["PW_physics_mm"] - baseline_full

final_model = XGBRegressor(
    n_estimators=150,
    max_depth=3,
    learning_rate=0.08,
    objective="reg:squarederror",
    random_state=42
)

final_model.fit(df[features], df["residual"])

print("Final model trained.")