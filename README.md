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

---

## 🚀 Getting Started

### Prerequisites

Ensure you have current versions of **Node.js** and **npm** installed on your machine.

### 1. Setup Project

```bash
# Clone the repository
git clone https://github.com/epavankalyan/voltlink-mobile.git
cd voltlink-mobile

# Install dependencies
npm install
```

### 2. Start the Application

Run the following command to start the development server:
```bash
npx expo start --clear
```

---

## 📱 How to Test the Application

There are **two primary ways** to preview and test VoltLink:

### Method A: Mobile (Expo Go)
The best way to experience the native feel and interactive maps.
1.  Install the **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2.  Scan the QR code displayed in your terminal after starting the server.
3.  **Network Tip**: 
    *   **Same Network**: If your phone and PC are on the same Wi-Fi, it works automatically.
    *   **Different Networks**: If you are using mobile data or different Wi-Fi, run `npx expo start --tunnel` instead.

### Method B: Web Browser
Fastest way to test UI, localization, and application logic.
1.  Once the server is running, open: [http://localhost:8081](http://localhost:8081)
2.  **Mobile Emulation**: We recommend the [Web Mobile First](https://www.webmobilefirst.com/en/) extension to test with iPhone/Android device frames.
3.  **Note**: The interactive map uses a placeholder on Web due to native hardware requirements, but all other features (State, Language, UI) work 100%.

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
├── store/                      # Zustand State Management
├── mock/                       # Mock Data (Stations, Users)
├── utils/                      # Theme constants & Utilities
└── assets/                     # Images & Icons
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
