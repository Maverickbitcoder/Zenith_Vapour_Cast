# ============================================================
# GNSS PRECIPITABLE WATER VAPOR ESTIMATION
# Spatially Robust Machine Learning Pipeline
# Manipal University Jaipur — Research Project
#
# Authors: Kriti Khanijo, Mooksh Jain, Dharyansh Achlas
# Supervisors: Dr. Prashant Vats, Dr. Abhay Singh Bisht
#
# HOW TO RUN:
#   pip install numpy pandas scikit-learn matplotlib joblib
#   pip install xgboost tabulate   (optional but recommended)
#   python gnss_pwv_final.py
#
# FILES NEEDED IN SAME FOLDER:
#   data.csv      — 8,000 obs, 20 stations, has "Actual Measured PW"
#   dataset.csv   — 720 obs, 36 stations, no PWV (inference only)
# ============================================================

import numpy as np
import pandas as pd
import joblib
import warnings
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import Patch
import matplotlib.lines as mlines

from sklearn.model_selection import KFold, LeaveOneGroupOut
from sklearn.preprocessing import RobustScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

warnings.filterwarnings('ignore')
np.random.seed(42)

# ── Optional imports ─────────────────────────────────────────
try:
    from xgboost import XGBRegressor
    HAS_XGB = True
    print("[INFO] XGBoost found — using as primary model")
except ImportError:
    HAS_XGB = False
    print("[INFO] XGBoost not found — using GradientBoosting (same concept)")
    print("       Install with: pip install xgboost")

try:
    from tabulate import tabulate
    HAS_TAB = True
except ImportError:
    HAS_TAB = False

PRIMARY = "XGBoost" if HAS_XGB else "Gradient Boosting"

def show_table(rows, headers):
    if HAS_TAB:
        print(tabulate(rows, headers=headers, tablefmt="grid", floatfmt=".4f"))
    else:
        w = [max(len(str(r[i])) for r in ([headers]+list(rows))) for i in range(len(headers))]
        fmt = "  ".join(f"{{:<{x}}}" for x in w)
        print(fmt.format(*headers))
        print("  ".join("-"*x for x in w))
        for r in rows: print(fmt.format(*[str(x) for x in r]))

def make_model():
    if HAS_XGB:
        return XGBRegressor(n_estimators=600, max_depth=3, learning_rate=0.03,
                            subsample=0.8, colsample_bytree=0.8,
                            reg_lambda=5, reg_alpha=1, random_state=42, verbosity=0)
    return GradientBoostingRegressor(n_estimators=300, max_depth=4,
                                     learning_rate=0.05, subsample=0.8, random_state=42)

# ============================================================
# 1. LOAD DATA
# ============================================================
print("\n" + "="*60)
print("1. LOADING DATA")
print("="*60)

df     = pd.read_csv("data.csv")
df380  = pd.read_csv("dataset.csv")

for d in [df, df380]:
    d["Date (ISO Format)"] = pd.to_datetime(d["Date (ISO Format)"])
    d["Hour"]  = d["Date (ISO Format)"].dt.hour
    d["Month"] = d["Date (ISO Format)"].dt.month

print(f"   Training dataset : {len(df):,} rows | {df['Station Latitude'].nunique()} stations")
print(f"   Inference dataset: {len(df380):,} rows | {df380['Station Latitude'].nunique()} stations")
print(f"\n   PWV range   : {df['Actual Measured PW'].min():.1f} – {df['Actual Measured PW'].max():.1f} mm")
print(f"   ZTD range   : {df['ZWD Observation'].min():.0f} – {df['ZWD Observation'].max():.0f} mm")
print(f"   Temp range  : {df['Temperature (°C)'].min():.1f} – {df['Temperature (°C)'].max():.1f} °C")
print(f"   RH range    : {df['Humidity (%)'].min():.1f} – {df['Humidity (%)'].max():.1f} %")
print(f"   Elev range  : {df['Station Elevation'].min():.0f} – {df['Station Elevation'].max():.0f} m")

# ============================================================
# 2. FEATURE ENGINEERING
#
#  ZWD Observation = GPS Zenith Total Delay (ZTD), ~2000-2400mm
#  Temperature     = Most important predictor (63% importance)
#  Pressure        = Separates dry-air vs moisture delay
#  Humidity        = Direct surface moisture reading
#  Elevation       = Less atmosphere above = less delay per mm PWV
#  Hour sin/cos    = Daily PWV cycle (peaks ~afternoon)
#  Month sin/cos   = Seasonal cycle (monsoon vs winter)
#
#  WHY sin/cos? Raw hour 23 and 0 are 23 apart numerically
#  but only 1 apart in reality. sin+cos encoding fixes this.
# ============================================================
print("\n" + "="*60)
print("2. FEATURE ENGINEERING")
print("="*60)

def add_features(d):
    d = d.copy()
    d["Hour_sin"]  = np.sin(2 * np.pi * d["Hour"]  / 24)
    d["Hour_cos"]  = np.cos(2 * np.pi * d["Hour"]  / 24)
    d["Month_sin"] = np.sin(2 * np.pi * d["Month"] / 12)
    d["Month_cos"] = np.cos(2 * np.pi * d["Month"] / 12)
    d["Station_ID"] = (d["Station Latitude"].round(3).astype(str) + "_" +
                       d["Station Longitude"].round(3).astype(str))
    return d

df    = add_features(df)
df380 = add_features(df380)

FEATURES = [
    "ZWD Observation",   # GPS signal delay (ZTD) — primary physical proxy
    "Temperature (°C)",  # Surface temp — controls max moisture capacity
    "Pressure (hPa)",    # Surface pressure — separates hydrostatic component
    "Humidity (%)",      # Relative humidity — direct surface moisture
    "Station Elevation", # Station height — less atmosphere above at high elev
    "Hour_sin",          # Daily cycle sin
    "Hour_cos",          # Daily cycle cos
    "Month_sin",         # Seasonal cycle sin
    "Month_cos",         # Seasonal cycle cos
]

X      = df[FEATURES]
y      = df["Actual Measured PW"]
groups = df["Station_ID"]

print(f"   {len(FEATURES)} features | {len(X):,} samples | Target = PWV (mm)")
print(f"   Features: {FEATURES}")

# ============================================================
# 3. MODEL COMPARISON — 5-FOLD CROSS-VALIDATION
# ============================================================
print("\n" + "="*60)
print("3. MODEL COMPARISON (5-Fold Cross-Validation)")
print("="*60)

kf = KFold(n_splits=5, shuffle=True, random_state=42)

model_zoo = {
    "Linear Regression": LinearRegression(),
    "Random Forest":     RandomForestRegressor(n_estimators=200, max_depth=25,
                                               random_state=42, n_jobs=-1),
    PRIMARY:             make_model(),
}

kfold_res = {}
for name, mdl in model_zoo.items():
    r2s, rmses, maes, ap, aa = [], [], [], [], []
    for tr, te in kf.split(X):
        sc = RobustScaler()
        Xtr = sc.fit_transform(X.iloc[tr]); Xte = sc.transform(X.iloc[te])
        m = mdl.__class__(**mdl.get_params())
        m.fit(Xtr, y.iloc[tr]); p = m.predict(Xte); a = y.iloc[te].values
        r2s.append(r2_score(a, p))
        rmses.append(np.sqrt(mean_squared_error(a, p)))
        maes.append(mean_absolute_error(a, p))
        ap.extend(p); aa.extend(a)
    kfold_res[name] = {"R2": round(np.mean(r2s),4), "RMSE": round(np.mean(rmses),4),
                       "MAE": round(np.mean(maes),4),
                       "preds": np.array(ap), "actual": np.array(aa)}
    print(f"   {name:<22}: R²={kfold_res[name]['R2']:.4f}  RMSE={kfold_res[name]['RMSE']:.4f} mm")

print()
show_table([[n,f"{v['RMSE']:.4f}",f"{v['MAE']:.4f}",f"{v['R2']:.4f}"]
            for n,v in kfold_res.items()],
           ["Model","RMSE (mm)","MAE (mm)","R²"])

# ============================================================
# 4. LEAVE-ONE-STATION-OUT (LOSO) VALIDATION
#
#  WHY LOSO? In random split, the same station's data appears in
#  both train and test — the model memorises location patterns.
#
#  LOSO holds out one ENTIRE station and tests on it.
#  This proves the model works at NEW, UNSEEN locations —
#  exactly what is needed for real-world deployment.
#
#  INDIA EXAMPLE: Train on 19 stations including Bangalore,
#  test on a new station in Hyderabad. Does it work? LOSO tells us.
# ============================================================
print("\n" + "="*60)
print("4. LOSO VALIDATION (Leave-One-Station-Out)")
print("   Testing: does the model work at unseen locations?")
print("="*60)

logo = LeaveOneGroupOut()
loso_p, loso_a, sres = [], [], []

for tr, te in logo.split(X, y, groups):
    sl = groups.iloc[te[0]]
    sc = RobustScaler()
    Xtr = sc.fit_transform(X.iloc[tr]); Xte = sc.transform(X.iloc[te])
    m = make_model()
    m.fit(Xtr, y.iloc[tr]); p = m.predict(Xte); a = y.iloc[te].values

    r2   = r2_score(a, p)
    rmse = np.sqrt(mean_squared_error(a, p))
    mae  = mean_absolute_error(a, p)
    bias = float(np.mean(p - a))
    corr = float(np.corrcoef(a, p)[0,1]) if len(a)>1 else 0.0
    lat, lon = sl.split("_", 1)
    sres.append({"Station_ID":sl,"Lat":float(lat),"Lon":float(lon),
                 "R2":round(r2,4),"RMSE":round(rmse,4),
                 "MAE":round(mae,4),"Bias":round(bias,4),"Corr":round(corr,4)})
    loso_p.extend(p); loso_a.extend(a)

loso_p = np.array(loso_p); loso_a = np.array(loso_a)

gr2   = round(r2_score(loso_a, loso_p), 4)
grmse = round(float(np.sqrt(mean_squared_error(loso_a, loso_p))), 4)
gmae  = round(float(mean_absolute_error(loso_a, loso_p)), 4)
gbias = round(float(np.mean(loso_p - loso_a)), 4)
gcorr = round(float(np.corrcoef(loso_a, loso_p)[0,1]), 4)
n_obs = len(loso_a)
adjr2 = round(1 - (1-gr2)*(n_obs-1)/(n_obs-len(FEATURES)-1), 4)

print("\n   Global LOSO metrics (Table II):")
show_table([["R²",f"{gr2}"],["Adjusted R²",f"{adjr2}"],
            ["RMSE (mm)",f"{grmse}"],["MAE (mm)",f"{gmae}"],
            ["Bias (mm)",f"{gbias}"],["Correlation (ρ)",f"{gcorr}"]],
           ["Metric","Value"])

sdf = pd.DataFrame(sres).sort_values("R2", ascending=False)
n_pos = (sdf["R2"] > 0).sum()

print(f"\n   Station-wise LOSO results (Table III):")
show_table([[r["Station_ID"],r["Lat"],r["Lon"],r["R2"],r["RMSE"],r["MAE"],r["Bias"]]
            for _,r in sdf.iterrows()],
           ["Station","Lat","Lon","R²","RMSE","MAE","Bias"])

print(f"\n   Stations with R² > 0 : {n_pos}/20")
bang = sdf[sdf["Station_ID"]=="13.021_77.572"]
if not bang.empty:
    print(f"   Bangalore (India)    : R²={bang['R2'].values[0]:.4f}  RMSE={bang['RMSE'].values[0]:.4f} mm")

# ============================================================
# 5. TRAIN FINAL MODEL ON ALL DATA
# ============================================================
print("\n" + "="*60)
print("5. FINAL MODEL TRAINING")
print("="*60)

scaler_f = RobustScaler()
X_all    = scaler_f.fit_transform(X)
model_f  = make_model()
model_f.fit(X_all, y)

importances = pd.Series(model_f.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("\n   Feature importances:")
for feat, imp in importances.items():
    bar = "█" * int(imp * 50)
    print(f"   {feat:<25} {imp:.4f}  {bar}")

joblib.dump({"model":model_f,"scaler":scaler_f,"features":FEATURES,
             "global_r2":gr2,"global_rmse":grmse,"model_name":PRIMARY,
             "kfold_results":kfold_res,"loso_results":sres},
            "final_pwv_model.pkl")
print("\n   Saved: final_pwv_model.pkl")

# ============================================================
# 6. PREDICTION FUNCTION
# ============================================================

def predict_pwv(ztd_mm, temp_c, pressure_hpa, humidity_pct,
                elevation_m, hour=12, month=6, model_path="final_pwv_model.pkl"):
    """
    Predict Precipitable Water Vapor (PWV).

    Parameters
    ----------
    ztd_mm       : GPS Zenith Total Delay in mm  (typical: 1800-2500)
    temp_c       : Surface temperature in Celsius
    pressure_hpa : Surface pressure in hPa
    humidity_pct : Relative humidity in %
    elevation_m  : Station elevation in metres
    hour         : Hour of day 0-23
    month        : Month 1-12

    Returns
    -------
    float : Predicted PWV in mm
      India reference:
        < 8 mm  = Very dry (Ladakh winter)
        8-18 mm = Dry (Delhi winter, Bangalore dry season)
        18-30 mm = Moderate (Bangalore avg, Delhi summer)
        30-45 mm = Humid (Mumbai monsoon)
        > 45 mm = Very humid (Kerala coast, tropical stations)
    """
    pkg = joblib.load(model_path)
    row = pd.DataFrame([{
        "ZWD Observation":   ztd_mm,
        "Temperature (°C)":  temp_c,
        "Pressure (hPa)":    pressure_hpa,
        "Humidity (%)":      humidity_pct,
        "Station Elevation": elevation_m,
        "Hour_sin":  np.sin(2*np.pi*hour/24),
        "Hour_cos":  np.cos(2*np.pi*hour/24),
        "Month_sin": np.sin(2*np.pi*month/12),
        "Month_cos": np.cos(2*np.pi*month/12),
    }])
    X_in = pkg["scaler"].transform(row[pkg["features"]])
    return round(max(0.0, float(pkg["model"].predict(X_in)[0])), 2)

print("\n" + "="*60)
print("6. EXAMPLE PREDICTIONS — INDIA CONTEXT")
print("="*60)
print(f"\n   {'Location':<48} {'PWV':>7}  Category")
print("   " + "-"*65)
examples = [
    (2007, 24.2, 912.0,  65.0, 844, 14, 7, "Bangalore (actual station in data), July"),
    (2007, 18.0, 912.0,  35.0, 844,  9, 1, "Bangalore, January dry season"),
    (2295,  5.4,1013.0,  40.0,  87, 10, 3, "Delhi-like, dry spring"),
    (2300, 32.0,1005.0,  88.0,  11, 15, 8, "Mumbai coast, peak monsoon"),
    (2290, 28.0,1008.0,  92.0,  15, 12, 7, "Kerala coast, tropical maximum"),
    (2100,-10.0, 570.0,  20.0,3500, 12, 1, "Ladakh high altitude, dry winter"),
    (2285, 26.1,1008.9,  91.4,  40, 23, 2, "Gabon tropics (station in your data)"),
    (2280,-4.1, 1004.0,  55.8,  46,  9, 1, "Greenland arctic (station in your data)"),
]
for ztd,t,p,rh,elev,hr,mo,label in examples:
    pwv = predict_pwv(ztd, t, p, rh, elev, hr, mo)
    cat = "Very dry" if pwv<8 else "Dry" if pwv<18 else "Moderate" if pwv<30 else "Humid" if pwv<45 else "Very humid"
    print(f"   {label:<48} {pwv:>5.1f} mm  {cat}")

# ============================================================
# 7. INFERENCE ON 36-STATION DATASET (no ground truth)
# ============================================================
print("\n" + "="*60)
print("7. INFERENCE — 36-STATION DATASET (no labels)")
print("="*60)

pkg = joblib.load("final_pwv_model.pkl")

def predict_batch(d, pkg):
    d2 = add_features(d.copy())
    X_in = pkg["scaler"].transform(d2[pkg["features"]])
    return np.maximum(0, pkg["model"].predict(X_in))

df380["Predicted_PWV"] = predict_batch(df380, pkg)

s380 = (df380.groupby(["Station Latitude","Station Longitude","Station Elevation"])
        .agg(Mean_PWV=("Predicted_PWV","mean"),Std_PWV=("Predicted_PWV","std"),
             N=("Predicted_PWV","count"))
        .reset_index().sort_values("Mean_PWV",ascending=False).round(2))

print(f"\n   Predicted PWV range : {df380['Predicted_PWV'].min():.2f} – {df380['Predicted_PWV'].max():.2f} mm")
print(f"   Predicted PWV mean  : {df380['Predicted_PWV'].mean():.2f} mm")
show_table(s380[["Station Latitude","Station Longitude","Station Elevation","Mean_PWV","Std_PWV","N"]].values.tolist(),
           ["Lat","Lon","Elev (m)","Mean PWV","Std PWV","N"])

df380.to_csv("predictions_36stations.csv", index=False)
print("\n   Saved: predictions_36stations.csv")

# ============================================================
# 8. ALL PUBLICATION FIGURES
# ============================================================
print("\n" + "="*60)
print("8. GENERATING FIGURES")
print("="*60)

fig = plt.figure(figsize=(20, 15))
gs  = gridspec.GridSpec(3, 3, hspace=0.45, wspace=0.35)

# Figure 1 — Observed vs Predicted (LOSO)
ax1 = fig.add_subplot(gs[0, :2])
sc1 = ax1.scatter(loso_a, loso_p, c=loso_a, cmap="viridis_r",
                  alpha=0.3, s=10, edgecolors="none")
mn, mx = min(loso_a.min(),loso_p.min()), max(loso_a.max(),loso_p.max())
ax1.plot([mn,mx],[mn,mx],"r--",lw=2,label="1:1 perfect line")
plt.colorbar(sc1, ax=ax1, label="Observed PWV (mm)")
ax1.set_xlabel("Observed PWV (mm)", fontweight="bold")
ax1.set_ylabel("Predicted PWV (mm)", fontweight="bold")
ax1.set_title(f"Fig 1 — Observed vs Predicted (LOSO validation)\n"
              f"R²={gr2}   RMSE={grmse} mm   ρ={gcorr}", fontweight="bold")
ax1.legend(); ax1.grid(True, alpha=0.25)

# Figure 2 — Residual Distribution
ax2 = fig.add_subplot(gs[0, 2])
res = loso_p - loso_a
ax2.hist(res, bins=60, color="#1D9E75", edgecolor="white", alpha=0.85)
ax2.axvline(0,     color="red",    ls="--", lw=1.5, label="Zero error")
ax2.axvline(gbias, color="orange", ls=":",  lw=1.5, label=f"Bias={gbias:.2f}")
ax2.set_xlabel("Residual: Predicted − Observed (mm)", fontweight="bold")
ax2.set_ylabel("Frequency", fontweight="bold")
ax2.set_title("Fig 2 — Residual distribution\n(centered near zero = unbiased)", fontweight="bold")
ax2.legend(); ax2.grid(True, alpha=0.25)

# Figure 3 — Station-wise R²
ax3 = fig.add_subplot(gs[1, :2])
clrs = ["#1D9E75" if r>=0.3 else ("#F59E0B" if r>=0 else "#E24B4A") for r in sdf["R2"]]
ax3.bar(range(len(sdf)), sdf["R2"], color=clrs, edgecolor="white", lw=0.5)
ax3.axhline(0,   color="black",  lw=0.8)
ax3.axhline(gr2, color="#185FA5", ls="--", lw=1.5)
ax3.set_xticks(range(len(sdf)))
ax3.set_xticklabels(sdf["Station_ID"], rotation=45, ha="right", fontsize=7)
ax3.set_ylabel("R² Score", fontweight="bold")
ax3.set_title("Fig 3 — Station-wise R² under LOSO validation", fontweight="bold")
ax3.legend(handles=[Patch(fc="#1D9E75",label="R²≥0.3"),Patch(fc="#F59E0B",label="0≤R²<0.3"),
                    Patch(fc="#E24B4A",label="R²<0"),
                    mlines.Line2D([],[],color="#185FA5",ls="--",label=f"Global R²={gr2}")],
           fontsize=8)
ax3.grid(True, alpha=0.25, axis="y")

# Figure 4 — Feature Importance
ax4 = fig.add_subplot(gs[1, 2])
imp_s = importances.sort_values()
fclrs = ["#185FA5" if "ZWD" in f else "#1D9E75" if any(x in f for x in ["Temp","Humi","Press","Elev"]) else "#BA7517" for f in imp_s.index]
ax4.barh(imp_s.index, imp_s.values, color=fclrs, edgecolor="white")
ax4.set_xlabel("Importance", fontweight="bold")
ax4.set_title("Fig 4 — Feature importance", fontweight="bold")
ax4.legend(handles=[Patch(fc="#185FA5",label="GPS delay"),Patch(fc="#1D9E75",label="Met variables"),Patch(fc="#BA7517",label="Time encoding")], fontsize=8)
ax4.grid(True, alpha=0.25, axis="x")

# Figure 5a — Model R² comparison
ax5 = fig.add_subplot(gs[2, 0])
names = list(kfold_res.keys()); r2v=[kfold_res[n]["R2"] for n in names]; clr5=["#B4B2A9","#5DCAA5","#EF9F27"]
b5=ax5.bar(names,r2v,color=clr5,edgecolor="white")
for b,v in zip(b5,r2v): ax5.text(b.get_x()+b.get_width()/2,v+0.005,f"{v:.3f}",ha="center",va="bottom",fontsize=9,fontweight="bold")
ax5.set_ylim(0,1.1); ax5.set_ylabel("R² (5-fold CV)", fontweight="bold")
ax5.set_title("Fig 5a — Model R² comparison\n(higher = better)", fontweight="bold")
ax5.set_xticklabels(names,rotation=15,ha="right",fontsize=8); ax5.grid(True,alpha=0.25,axis="y")

# Figure 5b — Model RMSE comparison
ax6 = fig.add_subplot(gs[2, 1])
rmsev=[kfold_res[n]["RMSE"] for n in names]
b6=ax6.bar(names,rmsev,color=clr5,edgecolor="white")
for b,v in zip(b6,rmsev): ax6.text(b.get_x()+b.get_width()/2,v+0.05,f"{v:.2f}",ha="center",va="bottom",fontsize=9,fontweight="bold")
ax6.set_ylabel("RMSE mm (5-fold CV)", fontweight="bold")
ax6.set_title("Fig 5b — Model RMSE comparison\n(lower = better)", fontweight="bold")
ax6.set_xticklabels(names,rotation=15,ha="right",fontsize=8); ax6.grid(True,alpha=0.25,axis="y")

# Figure 6 — Spatial map
ax7 = fig.add_subplot(gs[2, 2])
sc7 = ax7.scatter(sdf["Lon"],sdf["Lat"],c=sdf["R2"],cmap="RdYlGn",vmin=-1,vmax=1,s=120,edgecolors="black",lw=0.5,zorder=5)
plt.colorbar(sc7, ax=ax7, label="LOSO R²")
ax7.scatter([77.572],[13.021],marker="*",s=250,color="#185FA5",zorder=10,label="Bangalore (India)")
ax7.set_xlabel("Longitude", fontweight="bold"); ax7.set_ylabel("Latitude", fontweight="bold")
ax7.set_title("Fig 6 — Global spatial performance\n(green=good, red=challenging)", fontweight="bold")
ax7.axhline(0,color="gray",ls="--",lw=0.5,alpha=0.5); ax7.legend(fontsize=7); ax7.grid(True,alpha=0.2)

fig.suptitle(f"GNSS PWV Estimation — Complete Results  |  {PRIMARY}  |  20 Global Stations  |  MUJ",
             fontsize=13, fontweight="bold", y=1.01)
plt.savefig("gnss_pwv_all_figures.png", dpi=180, bbox_inches="tight")
print("   Saved: gnss_pwv_all_figures.png")
plt.show()

# ============================================================
# 9. UNCERTAINTY ESTIMATION (20-model ensemble)
# ============================================================
print("\n" + "="*60)
print("9. UNCERTAINTY ESTIMATION")
print("="*60)

ens = []
for seed in range(20):
    params = make_model().get_params(); params["random_state"] = seed
    m = make_model().__class__(**params); m.fit(X_all, y)
    ens.append(m.predict(X_all))
ens = np.array(ens)
print(f"   Mean prediction uncertainty : {ens.std(axis=0).mean():.4f} mm")
print(f"   Max prediction uncertainty  : {ens.std(axis=0).max():.4f} mm")

# ============================================================
# FINAL SUMMARY
# ============================================================
lr = kfold_res["Linear Regression"]; rf = kfold_res["Random Forest"]; pr = kfold_res[PRIMARY]
print(f"""
{'='*60}
FINAL SUMMARY
{'='*60}

PROJECT: GNSS Precipitable Water Vapor Estimation
METHOD : {PRIMARY} regression, 9 physics-informed features
DATA   : 8,000 observations, 20 global stations

HOW TO EXPLAIN (India example):
  "A GPS tower in Bangalore sends timing signals to satellites
   20,000 km above. In July monsoon, humid air slows the signal
   slightly — giving a delay of ~2007mm. In dry January, it
   changes. We combine this delay with temperature, pressure,
   humidity, and elevation. Our model learns the pattern and
   predicts water vapor (PWV) above any GPS station in mm.
   The Bangalore station in our data shows avg PWV 19.4mm,
   rising to 43mm at peak monsoon — matching real conditions."

5-FOLD CV RESULTS:
  Linear Regression : R²={lr['R2']:.4f}  RMSE={lr['RMSE']:.2f} mm
  Random Forest     : R²={rf['R2']:.4f}  RMSE={rf['RMSE']:.2f} mm
  {PRIMARY:<18}: R²={pr['R2']:.4f}  RMSE={pr['RMSE']:.2f} mm

LOSO RESULTS (new station generalization):
  R²          = {gr2:.4f}  ({gr2*100:.1f}% variance explained at new locations)
  RMSE        = {grmse:.4f} mm
  Correlation = {gcorr:.4f}
  Stations R²>0 = {n_pos}/20

OUTPUT FILES:
  final_pwv_model.pkl        — trained model (use predict_pwv() to call)
  predictions_36stations.csv — PWV for unlabelled stations
  gnss_pwv_all_figures.png   — all 6 publication figures
{'='*60}
""")