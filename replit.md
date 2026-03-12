# VoltLink Mobile

## Overview
VoltLink is an Expo React Native mobile application for EV (Electric Vehicle) charging intelligence. It supports two roles: Driver (fleet charging management) and B2C Customer (personal EV charging).

## Architecture
- **Framework**: Expo (React Native) with Expo Router (file-based routing)
- **Language**: TypeScript
- **State Management**: Zustand (stores: theme, role, language, vehicle)
- **Navigation**: Expo Router with stack navigation
- **Map**: Leaflet.js (web) via iframe, react-native-maps (native)
- **Styling**: React Native StyleSheet

## Project Structure
```
app/              # Expo Router pages
  _layout.tsx     # Root layout with navigation guard
  index.tsx       # Role selection screen
  b2c/            # B2C customer screens (dashboard, booking, session, etc.)
  driver/         # Driver screens (dashboard, booking, session, recommendations, etc.)
components/       # Reusable UI components
  charging/       # Recommendation cards
  feedback/       # Rating modal, report issue, SOS button
  filters/        # Filter content
  map/            # Map components (web + native variants)
  navigation/     # Tab bar
  profile/        # Profile view
  ui/             # Glass button
services/         # API services (api, b2c, booking, driver, session, stations)
store/            # Zustand stores (theme, role, language, vehicle)
types/            # TypeScript type definitions
utils/            # Theme utilities
assets/           # App icons and images
```

## Environment Variables
See `.env.example` for all required variables:
- `EXPO_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001/api/v1)
- `EXPO_PUBLIC_API_TIMEOUT` - Request timeout in ms
- `EXPO_PUBLIC_DEFAULT_FLEET_ID` - Default fleet ID
- `EXPO_PUBLIC_DEFAULT_USER_ID` - Default user ID
- `EXPO_PUBLIC_DEFAULT_DRIVER_ID` - Default driver ID
- `EXPO_PUBLIC_DEFAULT_LAT/LNG` - Default map center (Bangalore)
- `EXPO_PUBLIC_ENV` - Environment (development/staging/production)
- `EXPO_PUBLIC_SESSION_POLL_INTERVAL` - Session polling interval in ms

## Running the App
- **Web (dev)**: `npx expo start --web --port 5000` (configured as "Start application" workflow)
- **Android**: `expo run:android`
- **iOS**: `expo run:ios`

## Deployment
Configured for static deployment:
- Build: `npx expo export --platform web`
- Output: `dist/` directory

## Notes
- Uses `legacy-peer-deps=true` in `.npmrc` for dependency resolution
- Babel config includes a custom plugin to handle Zustand 5+ `import.meta.env` on web
- Web map uses Leaflet.js in an iframe (react-native-maps not used on web)
- The app has role-based navigation guards in `_layout.tsx`
