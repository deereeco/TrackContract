# Changelog

All notable changes to Contraction Tracker will be documented here.

## [0.2.0] - 2026-03-08

### Added
- **App update notification**: When a new version of the app is deployed, a red dot badge appears on the Settings tab in the navigation bar.
- **In-app update button**: Opening Settings reveals an "App Update Available" banner with an "Update Now" button. Tapping it applies the update and reloads the app — no need to manually clear browser cache or unregister service workers.
- **Version display**: The current app version is shown quietly at the bottom of the Settings page.
- **CHANGELOG.md**: This file, to track all future updates.

### Changed
- Service worker registration mode changed from `autoUpdate` to `prompt`, giving the app full control over when new versions are applied.

## [0.1.0] - Initial release

- Contraction timing with start/stop
- Intensity tracking
- Real-time sync via Firebase Firestore
- Session sharing with family and midwife
- Offline support via PWA / service worker
- Google Sign-In authentication
- Dark mode support
- Data export to JSON
- Archived contractions management
