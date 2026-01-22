# Contraction Tracker - Complete Setup Guide

## Pre-Deployment Checklist

### 1. Replace Placeholder Icons

The app currently has placeholder icons. Create proper icons before deployment:

**Required Icons:**
- `public/icon-192.png` - 192x192 pixels
- `public/icon-512.png` - 512x512 pixels
- `public/vite.svg` - SVG favicon

**Design Guidelines:**
- Use a simple, recognizable icon (e.g., timer, clock, heartbeat)
- Blue theme (#3B82F6) for consistency
- High contrast for visibility
- Transparent or white background

**Tools for Creating Icons:**
- [Favicon.io](https://favicon.io/) - Generate icons from text/emoji
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Generate all formats
- Figma/Canva - Design custom icons

### 2. Google Sheets Setup (Detailed)

#### Step 1: Create Your Tracking Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to something like "Labor Contractions Tracker"
4. Keep the default first tab name as "Contractions" (or note if you change it)

#### Step 2: Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions** > **Apps Script**
2. Delete any existing code in the editor
3. Open the `GoogleAppsScript.js` file from this repository
4. Copy all the code
5. Paste it into the Apps Script editor
6. Click the **Save** icon (disk icon) or press Ctrl+S
7. Click **Deploy** > **New deployment**
8. Click the gear icon next to "Select type"
9. Select **Web app**
10. Configure the deployment:
    - **Description**: "Contraction Tracker Sync" (optional)
    - **Execute as**: Me (your@email.com)
    - **Who has access**: Anyone
11. Click **Deploy**
12. Review permissions:
    - Click **Authorize access**
    - Choose your Google account
    - Click **Advanced** > **Go to [Project name] (unsafe)**
    - Click **Allow**
13. Copy the **Web app URL** (it starts with `https://script.google.com/macros/s/...`)
14. Keep this URL safe - you'll need it to configure the app

**Important Notes:**
- The script runs with YOUR permissions, so it can write to your sheet
- "Anyone" access means anyone with the URL can use it
- You can disable the deployment anytime from Apps Script > Deploy > Manage deployments

### 3. GitHub Pages Deployment

#### Enable GitHub Pages

1. Go to your GitHub repository
2. Click "Settings" tab
3. Scroll to "Pages" in left sidebar
4. Under "Build and deployment":
   - Source: "GitHub Actions"
5. Save changes

#### Initial Deployment

**Method 1: Using npm deploy command** (Recommended for testing)
```bash
npm run deploy
```

**Method 2: Push to trigger GitHub Actions** (Automatic)
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

The GitHub Actions workflow will automatically:
- Build the app
- Deploy to GitHub Pages
- Make it available at: `https://yourusername.github.io/Contract-Track/`

#### Verify Deployment

1. Wait 2-3 minutes for deployment to complete
2. Check Actions tab on GitHub for deployment status
3. Visit your app URL
4. Test that it loads correctly

### 4. Configure the App

#### First-Time Setup

1. Open the deployed app in your browser
2. Navigate to the "Settings" tab
3. Paste your **Apps Script deployment URL** (from Step 2)
4. Verify the sheet name (default: "Contractions")
5. Click "Test Connection"
6. If successful, click "Save Settings"

#### Test the Integration

1. Go to "Timer" tab
2. Click the big button to start a contraction
3. Wait a few seconds
4. Click again to stop
5. Check your Google Sheet - the contraction should appear within 60 seconds
6. Verify the data looks correct

### 5. Share with Family & Midwife

#### Sharing Options

**Option 1: Share Google Sheet Only**
- Share the Google Sheet link
- They can view/edit the data directly in Google Sheets
- No app access needed

**Option 2: Share App + Sheet**
- Share the app URL: `https://yourusername.github.io/Contract-Track/`
- Share the Google Sheet link
- They can view data in either location

**Option 3: Read-Only Access**
- Create a separate Google Sheet with read-only permissions
- Use Google Sheets IMPORTRANGE function to pull data
- Share the read-only sheet

#### What to Share

Send this message template:

```
Hi [Name],

I'm tracking contractions using this app:
[Your App URL]

You can view the live data in this Google Sheet:
[Your Sheet URL]

The app syncs automatically, so you'll see updates in real-time.
No action needed from you - just monitor the sheet!

Love,
[Your Name]
```

## Testing Before Labor

### Recommended Tests

1. **Timer Test**
   - Start/stop 5-10 practice contractions
   - Verify they appear in the list
   - Check Google Sheet for synced data

2. **Offline Test**
   - Turn off WiFi/mobile data
   - Record 2-3 contractions
   - Turn internet back on
   - Verify they sync to Google Sheet

3. **Manual Entry Test**
   - Add a contraction manually
   - Set date to past/future
   - Add intensity and notes
   - Verify it syncs

4. **Chart Test**
   - Record 5+ contractions with varying durations
   - Go to Chart tab
   - Verify chart displays correctly
   - Test time range filters

5. **PWA Test** (Mobile)
   - Open app in mobile browser
   - Tap "Install" or "Add to Home Screen"
   - Launch from home screen
   - Verify offline functionality

6. **Theme Test**
   - Toggle between light/dark mode
   - Verify preference persists on reload

7. **Shareable Link Test**
   - Go to Settings tab
   - Click "Generate Shareable Link"
   - Copy the link
   - Open it in an incognito/private window
   - Verify app auto-configures with "App automatically configured!" message
   - Try adding a contraction and verify it syncs

## Troubleshooting Common Issues

### "Sync Failed" Error

**Possible Causes:**
1. Apps Script deployment URL is incorrect
2. Apps Script not deployed as "Web app"
3. Apps Script "Who has access" set to wrong value
4. Apps Script authorization not completed

**Solutions:**
1. Verify deployment URL in Settings (should start with https://script.google.com/macros/s/)
2. In Apps Script, check Deploy > Manage deployments > ensure type is "Web app"
3. Ensure "Who has access" is set to "Anyone"
4. Re-authorize the script if needed (Deploy > New deployment)

### Contractions Not Appearing in Sheet

**Check:**
1. Internet connection
2. Sheet name matches exactly
3. Browser console for errors
4. Wait 60 seconds (background sync interval)

**Fix:**
1. Go to Settings tab
2. Click "Test Connection"
3. If fails, re-enter configuration
4. Save and retry

### App Won't Install as PWA

**Requirements:**
- HTTPS connection (GitHub Pages provides this)
- Manifest file (already included)
- Service worker (already configured)

**Try:**
- Desktop Chrome: Look for install icon in address bar
- Mobile Safari: Use "Add to Home Screen" from share menu
- Mobile Chrome: Tap "Install" banner or use menu

### Blank Screen on Load

**Check:**
1. Browser console for errors
2. Internet connection on first visit
3. Browser compatibility (use modern browser)

**Fix:**
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear browser cache
- Try incognito/private mode

## During Labor

### Best Practices

1. **Keep Phone Charged**
   - Keep charger nearby
   - Enable power saving mode if needed

2. **Have Backup Person**
   - Partner/doula can track if you can't
   - Share login credentials beforehand

3. **Test Before Active Labor**
   - Do a trial run early in labor
   - Verify everything works

4. **Don't Obsess Over App**
   - Focus on breathing and coping
   - Let partner handle tracking if needed

5. **Trust the Offline Mode**
   - Don't worry if internet drops
   - Everything syncs when reconnected

### When to Contact Midwife

The app will show patterns, but always follow your care provider's guidance. Common indicators to call:

- Contractions 5 minutes apart for 1 hour
- Contractions 1 minute long
- Any concerns or unusual symptoms

**Note:** This app is informational. Always prioritize medical advice over app data.

## Post-Labor

### Exporting Data

1. Open the Google Sheet
2. File > Download > CSV or Excel
3. Save for your records

### Clearing Data

1. Go to Settings
2. Delete API key
3. Clear browser data if using shared device
4. Delete Google Sheet if no longer needed

### Sharing Birth Story

The data can be useful for:
- Birth story documentation
- Understanding your labor pattern
- Future pregnancies
- Medical records

## Advanced Configuration

### Custom Sheet Structure

If you want to customize the Google Sheet:

**Default Columns:**
1. id
2. startTime
3. endTime
4. duration
5. intensity
6. notes
7. createdAt
8. updatedAt
9. deleted

**Don't modify these columns** - the app depends on this structure.

**Add custom columns:**
- You can add columns to the right (column J+)
- The app will ignore them
- Useful for manual notes, calculations, etc.

### Multiple Devices

**Easy Method (Recommended):**
1. Configure the app on your device
2. Go to Settings > "Generate Shareable Link"
3. Send the link to others via text/email
4. They click the link and it auto-configures
5. Everyone syncs to the same sheet!

**Manual Method:**
1. Open app on each device
2. Enter same Google Sheets configuration
3. Both devices will sync to same sheet
4. Data merges automatically

**Security Note:** The shareable link contains your Apps Script deployment URL encoded in the URL. The link clears from the browser after configuration, but only share with trusted people (partner, midwife, doula).

### Deployment URL Security

**Best Practices:**
- Only share deployment URL with trusted people (partner, midwife, doula)
- The URL allows anyone to write to your sheet
- You can disable the deployment anytime

**If Compromised:**
1. Go to Apps Script editor
2. Click Deploy > Manage deployments
3. Click Archive on the compromised deployment
4. Create a new deployment (Deploy > New deployment)
5. Update app Settings with new URL

## Support

If you encounter issues:

1. Check this guide first
2. Verify Google Cloud Console setup
3. Test connection in Settings
4. Check browser console for errors
5. Try in a different browser

## Feedback

After using the app, consider:
- What worked well?
- What could be improved?
- Any bugs or issues?
- Feature requests?

Document your experience for potential improvements!

---

**Remember:** The app is a tool to help track contractions. Trust your body, listen to your care provider, and don't let technology stress you out during labor. You've got this! 💙
