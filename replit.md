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
- **Theme**: Dark mode is the only theme. The theme toggle has been removed from the profile/settings screens. The theme store always returns 'dark'.
- **B2C Dashboard**: "All Stats" heading above metrics. CO₂ and Credits values formatted to 2 decimal places. "Find Charging Stations" CTA removed. "See All" in AI Recommendations has larger font.
- **Booking flow**: Both B2C and Driver bookings auto-redirect to History screen after success. History shows "Open Session" and cancel buttons on all active/pending items.
- **`vehicle_id`** must always be sent as integer (`parseInt`) in booking requests.
- **Session creation from booking**: `createSession` (POST /sessions) accepts `connector_id`, `vehicle_id`, `user_id`, `session_type`, and optional `booking_id`. History screens pass booking context (bookingId, connectorId, vehicleId) to session screens. When slider is dragged, session screens call createSession only (no separate startSession call). The `startSession` API has been removed from the codebase.
- **Cancel flow**: Both B2C and Driver use Modal with confirmation for booking cancel (DELETE /bookings/{id}) and session stop (PATCH /sessions/{id}/stop).
- **APK build resilience**: `api.service.ts` uses a hardcoded fallback URL (`voltlink-be.coffeebeans.io`) if `EXPO_PUBLIC_API_URL` is not set (warns instead of throwing). `eas.json` includes all env vars for development, preview, and production build profiles.
- **Session battery sync**: Both B2C and Driver session screens accept a `batteryLevel` route param (passed from history screens). A hydration `useEffect` also syncs from the vehicle store after it loads from AsyncStorage. Charging simulation starts from the current displayed battery percentage, not a hardcoded value. All battery checks use `!= null` (not truthy) to correctly handle 0% battery.
