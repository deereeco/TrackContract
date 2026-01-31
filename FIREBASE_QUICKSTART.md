# Firebase Quick Start Guide

**Branch:** `firebase-migration` (ready for testing)

---

## 🚀 Get Started in 5 Minutes

### Step 1: Create Firebase Project

1. Visit https://console.firebase.google.com
2. Click "Add project"
3. Name it (e.g., "Contraction Tracker")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore

1. In Firebase Console, go to **Build → Firestore Database**
2. Click "Create database"
3. Choose "Production mode"
4. Select a location (closest to you)
5. Click "Enable"

### Step 3: Get Your Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register app (nickname: "Web App")
5. Copy the `firebaseConfig` values

### Step 4: Configure Your App

```bash
# In your project directory
cp .env.example .env
```

Edit `.env` and paste your Firebase values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

### Step 5: Set Security Rules

In Firebase Console → Firestore → Rules tab, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/contractions/{contractionId} {
      allow read, write: if true;
    }
  }
}
```

Click **Publish**.

### Step 6: Run the App

```bash
# Restart dev server
npm run dev
```

### Step 7: Enable Firebase Backend

1. Open the app (http://localhost:5173)
2. Go to **Settings** tab
3. Select **Firebase (Recommended)**
4. Click "Confirm Change" (app reloads)
5. Done! Real-time sync is active ✅

---

## 🧪 Test Real-Time Sync

1. Open Settings → Generate Shareable Link
2. Copy the link
3. Open link in a new browser tab (or different browser)
4. Start a contraction in Tab 1
5. Watch it appear instantly in Tab 2 🎉

---

## 🔄 Migrate from Google Sheets (Optional)

If you have existing Google Sheets data:

1. Make sure Google Sheets config is saved in Settings
2. Switch backend to Firebase
3. Scroll to "Migrate from Google Sheets" section
4. Click "Start Migration"
5. Wait for completion (usually 5-10 seconds)

---

## 📊 View Your Data

Firebase Console → Firestore Database → Data tab:

```
users/
  └─ {your-user-id}/
      └─ contractions/
          ├─ {contraction-1-id}
          ├─ {contraction-2-id}
          └─ {contraction-3-id}
```

---

## 🐛 Troubleshooting

**Firebase not showing in Settings?**
- Check `.env` file exists and has all 6 values
- Restart dev server: `npm run dev`
- Check browser console for errors

**Real-time sync not working?**
- Verify Firestore rules are published
- Check Network tab for WebSocket connection
- Make sure both devices use the same share link

**"Permission denied" error?**
- Publish security rules in Firebase Console
- Enable Anonymous Authentication (Settings → Authentication → Sign-in method)

---

## 📦 Deploy to Production

### Build
```bash
npm run build
```

### Deploy (using your preferred hosting)
```bash
# Firebase Hosting
firebase deploy

# Or Netlify, Vercel, etc.
npm run build
# Upload dist/ folder
```

### Important: Update .env for Production
- Create `.env.production` with production Firebase project
- Never commit `.env` to git (already in .gitignore)

---

## 🎯 Next Steps

- ✅ Test offline mode (disconnect internet, add contractions)
- ✅ Test on mobile device (use share link)
- ✅ Share with partner/family for testing
- ⏳ Monitor Firebase Console for usage
- ⏳ Consider adding password protection for links
- ⏳ Deploy to production

---

**Need Help?**
- Check `FIREBASE_MIGRATION_SUMMARY.md` for detailed documentation
- Review browser console for error messages
- Check Firebase Console → Firestore for data structure

---

**You're all set!** 🚀

Firebase is configured and ready to sync contractions in real-time across all your devices.
