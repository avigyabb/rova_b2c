# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ambora** (`rova_b2c`) is a React Native social app built with Expo. Users create ranked category lists (movies, songs, albums, etc.) and share them with followers. The app is live on iOS (App Store ID: 6483945060, bundle: `com.swing.b2capp`).

## Commands

```bash
# Development
npm start                    # Start Expo dev server
npx expo start -c            # Clear cache and start (use when module issues arise)
npx expo start --tunnel      # Use tunnel if LAN connection fails

# Platform
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npm run web                  # Run web version

# Release (iOS)
bash ./scripts/release-ios.sh production   # Increments build number, EAS build + TestFlight submit
```

There is no test suite. No linting commands are configured.

## Architecture

### Navigation
Two navigation layers coexist:
- **`expo-router`** (file-based): owns `app/_layout.js` → Stack navigator, handles deep links via scheme `amborasocial://`
- **`@react-navigation/bottom-tabs`**: rendered inside `app/index.js`, provides the 5-tab UI (Feed, Explore, Add, Groups, Profile)

Authentication is gated in `app/index.js`: it reads a `key` from `AsyncStorage` and either renders auth screens (`Login`/`SignIn`) or the tab navigator.

### Data Layer
Firebase Realtime Database (not Firestore) is the sole backend. `firebaseConfig.js` exports `{ database, storage, auth }`. All components call Firebase SDK directly — there is no service/repository layer. Real-time listeners (`onValue`, `onChildAdded`) are used throughout for live updates.

### Component Organization
All screens live in `app/components/`. There is no Redux/Zustand — state is managed with `useState`/`useEffect` hooks local to each component. Sub-feature folders exist for more complex flows:
- `AddFlow/` — tagging screens (location, friends) within the Add tab
- `LoginFlow/` — category selection during signup
- `CategoryListComponents/` — category comparison UI
- `ExploreComponents/` — explore item tiles

`app/consts.js` holds category presets, school mappings, and other app-wide constants.

### Firebase SDK Notes
The project uses **both** the JS SDK (`firebase` v11) and native modules (`@react-native-firebase`). Metro is configured in `metro.config.js` to disable package exports and allow `.cjs` for Firebase compatibility. Do not change these Metro settings.

`babel.config.js` must include `react-native-reanimated/plugin` as the last plugin — this is required by Reanimated and must not be moved.

### New Architecture
`newArchEnabled: true` is set in `app.json`. React Native New Architecture (JSI/Fabric) is active. Avoid libraries that are not compatible with the New Architecture.

## Build Configuration

- **EAS**: `eas.json` defines `development`, `preview`, and `production` profiles
- **Production iOS image**: `macos-sequoia-15.5-xcode-16.4`
- **App version**: managed locally (`"appVersionSource": "local"` in `eas.json`)
- **iOS build number**: auto-incremented by `scripts/release-ios.sh` using `xcrun agvtool`

## Key Files

| File | Purpose |
|---|---|
| `firebaseConfig.js` | Firebase init (project: `swing-b2c`), exports `database`, `storage`, `auth` |
| `app/index.js` | Auth gate + bottom tab navigator |
| `app/_layout.js` | Root Stack layout (expo-router entry) |
| `app/consts.js` | Category types, presets, school/university mappings |
| `app/components/Feed.js` | Main feed (Following + Top tabs) |
| `app/components/Profile.js` | User profile, category management |
| `app/components/Add.js` | Create item / new list flow |
