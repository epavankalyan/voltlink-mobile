# ⚡ VoltLink Mobile App

VoltLink is a premium, glassmorphic EV charging and fleet management application built with **Expo SDK 54** and **React Native**. It offers a seamless experience for both individual EV owners (B2C) and professional fleet drivers.

---

## ✨ Features

### 🚗 Driver Dashboard (Fleet)
- **Real-time Battery Monitoring** — Visual state-of-charge tracking
- **AI-Powered Recommendations** — Smart charging station suggestions based on battery levels, route, and preferences
- **Session Management** — Live charging session tracking with real-time stats
- **Booking System** — Reserve charging slots directly from the app
- **Charging History** — View past sessions and analytics

### 💳 B2C Customer Experience
- **VoltCredits System** — Earn and spend credits for charging sessions
- **Discover Stations** — Find and explore nearby charging stations
- **Transaction History** — Track your earnings and usage with a detailed log
- **Session Tracking** — Monitor active and past charging sessions

### 🎨 Design & UX
- **Glassmorphic UI** — High-end visual aesthetic with real-time blur effects
- **Dynamic Themes** — Fully supported Dark and Light modes
- **Floating Tab Navigation** — Custom tab bar for easy access to core features
- **Smooth Animations** — Polished transitions and micro-interactions

---

## 🛠 Tech Stack

| Technology | Usage |
|---|---|
| [Expo SDK 54](https://expo.dev/) | Framework |
| React Native | Cross-platform mobile UI |
| Expo Router | File-based navigation & routing |
| Zustand | Lightweight state management |
| Lucide React Native | Iconography |
| Expo Blur | Glassmorphic blur effects |
| Expo Linear Gradient | Gradient backgrounds |
| React Native Maps | Map integration |
| React Native Reanimated | Performant animations |
| TypeScript | Type safety |
| Axios | HTTP client |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **EAS CLI** (for APK/AAB builds): `npm install -g eas-cli`

### 1. Clone & Install

```bash
git clone https://github.com/epavankalyan/voltlink-mobile.git
cd voltlink-mobile
make install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
# Required — point to your backend (local or remote)
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

> **Note:** The app will throw an error at startup if `EXPO_PUBLIC_API_URL` is not set.

### 3. Start the Development Server

```bash
make start
```

---

## 🔧 Environment Variables

All variables are prefixed with `EXPO_PUBLIC_` and defined in `.env` (copy from `.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ Yes | — | Full backend API base URL (e.g. `https://api.voltlink.io/api/v1`) |
| `EXPO_PUBLIC_API_TIMEOUT` | No | `10000` | Request timeout in milliseconds |
| `EXPO_PUBLIC_DEFAULT_FLEET_ID` | No | `1` | Fallback fleet ID for fleet-level calls |
| `EXPO_PUBLIC_DEFAULT_USER_ID` | No | `11` | Fallback B2C user ID before auth resolves |
| `EXPO_PUBLIC_DEFAULT_LAT` | No | `12.9716` | Default map latitude (Bangalore) |
| `EXPO_PUBLIC_DEFAULT_LNG` | No | `77.5946` | Default map longitude (Bangalore) |
| `EXPO_PUBLIC_ENV` | No | `development` | Runtime environment: `development` \| `staging` \| `production` |

---

## 📦 Building APKs

Run `make help` to see all available targets. Key build commands:

```bash
# 1. Log in to your Expo / EAS account (one-time)
make eas-login

# 2. Configure EAS for this project (one-time, creates eas.json)
make eas-configure

# 3a. Preview APK — signed, distributable (great for testers)
make build-apk-preview

# 3b. Production APK — store-ready, signed
make build-apk-production

# 3c. Production AAB — for Google Play Store submission
make build-aab-production
```

EAS builds run in the cloud. Download the output from the [EAS dashboard](https://expo.dev/) once the build completes.

### Build Profiles (`eas.json`)

| Profile | Format | Use case |
|---|---|---|
| `development` | APK | Internal dev builds with dev client |
| `preview` | APK | QA / tester distribution |
| `production` | AAB | Google Play Store submission |

---

## 📱 How to Test the Application

### Method A: Mobile (Expo Go)
1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. Run `make start` and scan the QR code.
3. Ensure your phone and machine are on the **same Wi-Fi**, or use `npx expo start --tunnel` if on different networks.

### Method B: Web Browser
1. Run `make web` and open [http://localhost:8081](http://localhost:8081).
2. Use the [Web Mobile First](https://www.webmobilefirst.com/en/) extension for device-frame emulation.
3. **Note:** The interactive map uses a placeholder on web; all other features work fully.

---

## 📁 Project Structure

```
voltlink-mobile/
├── app/                        # Screens & Routing (Expo Router)
│   ├── index.tsx               # Role selection landing page
│   ├── _layout.tsx             # Root layout with role-based navigation
│   ├── (driver)/               # Fleet driver screens
│   └── (b2c)/                  # B2C customer screens
├── components/                 # Reusable UI Components
│   ├── map/                    #   Platform-specific Map components
│   ├── ui/                     #   Core building blocks (Glassmorphism)
│   └── navigation/             #   Custom floating tab bar
├── services/                   # API service layer (Axios)
│   ├── api.service.ts          #   Axios instance & interceptors
│   ├── stations.service.ts     #   Charging station APIs
│   ├── driver.service.ts       #   Driver/vehicle APIs
│   └── b2c.service.ts          #   B2C user APIs
├── store/                      # Zustand State Management
├── utils/                      # Theme constants & utilities
├── assets/                     # Images & Icons
├── .env.example                # Environment variable template
├── eas.json                    # EAS Build profiles
└── Makefile                    # Developer task runner
```

---

## 🧭 App Flow

1. **Role Selection** — Pick **Driver** or **B2C Customer** on launch.
2. **Dashboard** — Context-aware home screen loads automatically.
3. **Navigation** — Use the floating tab bar to explore Booking, Sessions, and Credits.
4. **Charging Flow** — Discover stations → book a slot → monitor live sessions.

---

## 📜 License

This project is licensed under the **MIT License**.

Built with ⚡ for the future of Electric Mobility.
