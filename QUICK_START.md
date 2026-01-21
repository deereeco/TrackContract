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
2. Share it (public or with specific people)
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create a project
5. Enable "Google Sheets API"
6. Create an API key
7. Restrict to Sheets API only

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
3. Enter API key and Sheet URL
4. Test connection
5. Save settings

### 5. Test It!

1. Record a few contractions
2. Check they appear in Google Sheet
3. Test offline mode
4. Share Sheet link with family

## That's It!

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## App URL

After deployment: `https://yourusername.github.io/Contract-Track/`

## Need Help?

Check the troubleshooting section in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
