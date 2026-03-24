# 🌧️ ZenithVapourCast

High-resolution precipitable-water insights from GNSS zenith-wet delay, powered by ML for clearer nowcasts, smoother planning, and research-grade transparency.

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Team](#team)
- [License](#license)

---

## 🌊 About

ZenithVapourCast transforms raw GNSS (Global Navigation Satellite System) observations into actionable tropospheric moisture intelligence by learning the relationship between zenith-wet delay (ZWD) and precipitable water (PW) across regions and seasons.

Built by weather-curious engineers, it blends robust preprocessing, supervised models, and quality checks to surface PW alongside temperature, pressure, and humidity context on an interactive dashboard.

**The Goal**: Make atmospheric water vapor visible and useful for forecasters, researchers, and operations—without the data wrangling overhead.

---

## ✨ Features

### Core Capabilities
- 📡 **RINEX File Processing**: Upload and parse compressed RINEX (.Z) observation files
- 🤖 **ML-Powered Predictions**: Predict precipitable water from GNSS ZWD observations
- 🗺️ **Spatial Interpolation**: Interpolate PW values for any coordinate globally
- 🌤️ **Weather Integration**: Fetch real-time meteorological data from Open-Meteo API
- 📊 **Interactive Dashboard**: Visualize PW trends with region cards and timelines
- 🔐 **Secure Authentication**: JWT-based authentication system

### Workflow
1. **Feature Engineering**: Spatial and temporal features—latitude, longitude, elevation, month index, and local weather covariates—are normalized and aligned
2. **Modeling**: Supervised regression maps ZWD and context features to PW, with cross-validation and region-wise calibration
3. **Inference**: For any region and month, estimates PW in near-real-time with temperature, pressure, and humidity context
4. **Visualization**: Interactive dashboard renders region cards and timelines for trend analysis

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZenithVapourCast                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌─────────────────────────────────────┐  │
│  │    Frontend      │     │            Backend                  │  │
│  │  (Next.js 15)    │◄────│  (Express.js + Python ML)          │  │
│  │                  │     │                                     │  │
│  │  - Landing Page  │     │  ┌──────────────────────────────┐  │  │
│  │  - Dashboard     │     │  │         Routes                │  │  │
│  │  - Auth Pages    │     │  │  - /api/auth (JWT)           │  │  │
│  │  - Visualizations│     │  │  - /api/pw/by/* (Predictions)│  │  │
│  │  - Maps (Leaflet)│     │  │  - /api/refresh-token        │  │  │
│  └──────────────────┘     │  └──────────────────────────────┘  │  │
│                           │                                     │  │
│                           │  ┌──────────────────────────────┐  │  │
│                           │  │         Python ML            │  │  │
│                           │  │  - unified_predictor.py     │  │  │
│                           │  │  - GPR/GBR Models           │  │  │
│                           │  │  - Spatial Interpolation    │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           │                                     │  │
│                           │  ┌──────────────────────────────┐  │  │
│                           │  │         Database             │  │  │
│                           │  │  - PostgreSQL (Users)       │  │  │
│                           │  │  - RINEX Data Storage       │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           └─────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Animations |
| Leaflet | Interactive maps |
| NextAuth.js | Authentication |
| TypeScript | Type safety |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js 5 | Node.js web framework |
| PostgreSQL | Relational database |
| JWT | Token-based authentication |
| bcrypt | Password hashing |
| multer | File upload handling |
| Python 3 | ML model execution |

### Machine Learning
| Technology | Purpose |
|------------|---------|
| scikit-learn | ML pipeline |
| pandas | Data processing |
| numpy | Numerical computing |
| joblib | Model serialization |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL database
- Git

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codebase
   ```

2. **Set up environment variables**

   Create `.env` files in both `backend/` and `frontend/` directories:

   ```env
   # backend/.env
   DATABASE_URL=postgresql://user:password@localhost:5432/zenithvapourcast
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ```

   ```env
   # frontend/.env
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Install dependencies**

   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install

   # Install Python dependencies
   cd ../model
   pip install -r requirements.txt
   ```

4. **Set up the database**

   ```bash
   # Create PostgreSQL database
   psql -U postgres
   CREATE DATABASE zenithvapourcast;
   \q
   ```

5. **Run the application**

   ```bash
   # Terminal 1: Start backend
   cd backend
   npm start

   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth`
User login and signup.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "action": "login" | "signup",
  "username": "unique_username"  // Required for signup
}
```

**Response:**
```json
{
  "message": ["Login successful"],
  "user": { "id": 1, "email": "user@example.com", "username": "user" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Prediction Endpoints

All prediction endpoints require JWT authentication via `Authorization` header.

#### POST `/api/pw/by/rinex`
Process RINEX observation files for PW prediction.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
| Parameter | Type | Description |
|-----------|------|-------------|
| rinexFile | File | Compressed RINEX file (.Z) |
| includeMeteoData | Boolean | Include weather data (optional) |

**Response:**
```json
{
  "success": true,
  "message": "RINEX file processed successfully",
  "extractedData": {
    "stationId": "STN1",
    "stationLatitude": 25.5847,
    "stationLongitude": -246.7653,
    "zwdObservation": 15.23,
    "satelliteAzimuth": 180,
    "satelliteElevation": 45,
    "temperature": 25.5,
    "pressure": 1013.2,
    "humidity": 65
  },
  "prediction": {
    "predicted_pw": 2.4368,
    "uncertainty": 0.15,
    "method": "spatial_interpolation"
  }
}
```

#### POST `/api/pw/by/interpolation`
Get PW prediction for specific coordinates.

**Request Body:**
```json
{
  "latitude": 34.0522,
  "longitude": -118.2437
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interpolation completed successfully",
  "coordinates": {
    "latitude": 34.0522,
    "longitude": -118.2437
  },
  "prediction": {
    "predicted_pw": 1.8473,
    "uncertainty": 0.12,
    "method": "spatial_interpolation"
  },
  "processedAt": "2024-09-15T12:30:00.000Z"
}
```

---

## 📁 Project Structure

```
codebase/
├── backend/                 # Express.js backend
│   ├── index.js            # Server entry point
│   ├── middleware/
│   │   └── authenticateToken.js  # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Login/signup routes
│   │   ├── pw-by.js        # Prediction endpoints
│   │   ├── refresh-token.js # Token refresh
│   │   └── unified_predictor.py  # Python ML wrapper
│   ├── data/               # GNSS station data
│   │   ├── downloads/      # RINEX file downloads
│   │   └── station_data/   # Station metadata
│   ├── uploads/            # Uploaded RINEX files
│   └── package.json
│
├── frontend/               # Next.js 15 application
│   ├── src/app/
│   │   ├── page.tsx       # Landing page
│   │   ├── dashboard/     # Dashboard page
│   │   ├── auth/          # Authentication page
│   │   ├── components/    # React components
│   │   └── globals.css    # Global styles
│   ├── public/
│   │   ├── bg_img/        # Background images
│   │   ├── bg_noise/      # Texture assets
│   │   └── team_dps/      # Team photos
│   ├── package.json
│   └── README.md
│
├── model/                  # Machine learning models
│   ├── test.py            # Model testing
│   ├── pickle-model-generator-1.py
│   ├── pickle-model-generator-2.py
│   ├── enhanced_gnss_pw_model_fixed.pkl
│   └── dataset.csv        # Training data
│
├── test/                   # Testing and experimentation
│   └── ZENITH.ipynb       # Jupyter notebooks
│
└── README.md              # This file
```

---

## 👥 Team - MaSKeD

| Name | Role | Responsibilities |
|------|------|------------------|
| **Mooksh Jain** | AIML Model Engineer | GPR Model Development, ML pipeline |
| **Kriti Khanijo** | AIML Model Engineer | GBR Model Development, Model optimization |
| **Dharyansh Achlas** | Team Lead | FullStack Development,ZenithVapourCast UI/UX Development, Model Integration, Architecture |

---

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

## 📧 Contact

For questions or support, please contact the team lead: **Dharyansh Achlas**

---

**Built with 💧 for better weather insights**

