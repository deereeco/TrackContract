# Contraction Tracker

A modern, offline-first contraction tracking web app designed for labor monitoring. Features real-time timer, data visualization, and cloud sync via Google Sheets.

## Features

- **Timer Mode**: Large, easy-to-tap button for tracking contractions in real-time
- **Offline-First**: Works without internet connection, syncs when online
- **Data Visualization**: Charts showing contraction duration and interval patterns
- **Cloud Sync**: Automatic sync to Google Sheets for sharing with family and midwife
- **Dark Mode**: Eye-friendly dark theme (default) with light mode option
- **PWA Support**: Installable as a mobile app
- **Manual Entry**: Add missed contractions retroactively

## Quick Start

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

### Production Build

```bash
npm run build
npm run preview
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

## Google Sheets Setup

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name the first tab "Contractions" (or your preferred name)

### 2. Deploy Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions** > **Apps Script**
3. Delete any existing code
4. Copy the code from `GoogleAppsScript.js` in this repository
5. Paste it into the Apps Script editor
6. Click **Deploy** > **New deployment**
7. Select type: **Web app**
8. Set "Execute as": **Me**
9. Set "Who has access": **Anyone**
10. Click **Deploy**
11. Copy the deployment URL

### 3. Configure the App

1. Open the app and navigate to the **Settings** tab
2. Paste your **Apps Script deployment URL**
3. Verify the **Sheet Name** (default: "Contractions")
4. Click **Test Connection** to verify
5. Click **Save Settings**

## Usage

### Tracking Contractions

1. **Timer Mode** (recommended during labor):
   - Tap the large button when a contraction starts
   - Timer displays elapsed time
   - Tap again when contraction ends
   - Contraction is saved instantly to local storage

2. **Manual Entry**:
   - Go to "List" tab
   - Click "Add" button
   - Enter date, time, and duration
   - Optionally add intensity (1-10) and notes

3. **View Data**:
   - **List Tab**: See all contractions chronologically
   - **Chart Tab**: Visualize patterns over time
   - Filter by time range: 1h, 6h, 24h, or all

### Syncing

- Automatic sync occurs:
  - Every 60 seconds when online
  - When you return online after being offline
  - After each contraction is saved
- Manual sync: Pull down to refresh in any view
- Sync status shown in header (offline indicator when disconnected)

### Sharing with Midwife/Family

**Easy Sharing (Recommended):**
1. Go to Settings tab
2. Click "Generate Shareable Link"
3. Copy the link and send it via text/email
4. Recipients click the link and the app auto-configures
5. Everyone tracks to the same Google Sheet - no setup needed!

**Alternative - Share Google Sheet Only:**
1. Share the Google Sheet link with anyone who needs access
2. They can view real-time updates as contractions are recorded
3. Data includes: timestamp, duration, intensity, notes

**Multiple Devices:**
- Everyone can use the app simultaneously
- All contractions sync to the same sheet
- Perfect for partner tracking while you focus on labor

## Technical Details

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Storage**: IndexedDB (via Dexie.js)
- **Sync**: Google Sheets API v4
- **PWA**: Vite PWA plugin + Workbox

### Architecture

- **Offline-First**: All data stored locally in IndexedDB
- **Sync Engine**: Background sync with retry logic and conflict resolution
- **Last-Write-Wins**: Conflicts resolved by timestamp
- **PWA**: Service worker for offline functionality

### Browser Support

- Modern browsers with IndexedDB support
- Recommended: Chrome, Safari, Firefox, Edge (latest versions)

## Project Structure

```
src/
├── components/        # React components
│   ├── Timer/        # Timer button, display, summary
│   ├── ContractionList/  # List view and manual entry
│   ├── Charts/       # Data visualization
│   ├── Layout/       # Header, navigation
│   └── Settings/     # Google Sheets configuration
├── contexts/         # React contexts for state management
├── hooks/           # Custom React hooks
├── services/        # Business logic
│   ├── storage/     # IndexedDB and localStorage
│   ├── sync/        # Sync engine and queue
│   └── googleSheets/  # Google Sheets API client
├── types/           # TypeScript interfaces
└── utils/           # Helper functions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages

### Environment Variables

No environment variables needed. API key and sheet ID are configured in the app's Settings tab and stored in browser localStorage.

## Privacy & Security

- **Script URL Storage**: Stored in browser's localStorage (client-side only)
- **Data Storage**: All data stored locally in browser's IndexedDB
- **No Server**: No backend server, uses Google Apps Script as proxy to Google Sheets
- **Google Sheets Access**: Uses Google Apps Script deployment (runs with your Google account permissions)
- **Security**: Only people with the deployment URL can write to your sheet

## Troubleshooting

### Sync Not Working

1. Check internet connection
2. Verify Apps Script deployment URL is correct in Settings
3. Ensure Apps Script is deployed as "Web app" with "Anyone" access
4. Check browser console for errors
5. Test connection in Settings tab

### App Not Loading Offline

1. Ensure you visited the app while online at least once
2. Check if service worker is registered (browser DevTools > Application > Service Workers)
3. Try clearing cache and reloading

### Data Not Showing

1. Check browser's IndexedDB (DevTools > Application > IndexedDB > ContractionTrackerDB)
2. Try refreshing the page
3. Check for any JavaScript errors in console

## Contributing

This is a personal project for family use, but suggestions are welcome!

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub.

---

**Note**: This app is designed for informational purposes. Always follow your healthcare provider's guidance during labor and delivery.
