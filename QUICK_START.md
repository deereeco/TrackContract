# Quick Start Guide

## For Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## For Deployment

### 1. Replace Icons (IMPORTANT!)

Replace these placeholder files with actual icons:
- `public/icon-192.png` (192x192 pixels)
- `public/icon-512.png` (512x512 pixels)

Use [Favicon.io](https://favicon.io/) or similar to generate icons.

### 2. Set Up Google Sheets

1. Create a Google Sheet
2. Go to Extensions > Apps Script
3. Copy code from `GoogleAppsScript.js` in repo
4. Deploy as Web app (Execute as: Me, Access: Anyone)
5. Copy the deployment URL

### 3. Deploy to GitHub Pages

**Option A: Manual Deploy**
```bash
npm run deploy
```

**Option B: Automatic via GitHub Actions**
1. Push to GitHub
2. Enable GitHub Pages in repo Settings > Pages
3. Set source to "GitHub Actions"
4. Push changes to main branch
5. App deploys automatically

### 4. Configure the App

1. Open deployed app
2. Go to Settings tab
3. Paste Apps Script deployment URL
4. Test connection
5. Save settings

### 5. Test & Share!

1. Record a few contractions
2. Check they appear in Google Sheet
3. Test offline mode
4. Click "Generate Shareable Link" in Settings
5. Send the link to partner/midwife
6. They click and use immediately - no setup!

## That's It!

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## App URL

After deployment: `https://yourusername.github.io/TrackContract/`

## Need Help?

Check the troubleshooting section in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
