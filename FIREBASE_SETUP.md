# Firebase Setup Guide

## Quick Setup (5 minutes)

### 1. Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one)
3. Click the **gear icon** → **Project settings**
4. Scroll to **"Your apps"** section
5. Click on your web app (or click **"Add app"** → **Web** if you haven't created one)
6. Copy the config values from `firebaseConfig`

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnop",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 2. Update the Config File

Open `src/config/firebaseConfig.ts` and replace the placeholder values with your actual Firebase config:

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyC...",  // ← Paste your actual values here
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 3. Set Up Firestore Security Rules

In Firebase Console:
1. Go to **Firestore Database**
2. Click **Rules** tab
3. Add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own contractions
    match /users/{userId}/contractions/{contractionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Allow users to read/write their archived contractions
    match /users/{userId}/archived/{contractionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

### 4. Enable Anonymous Authentication

In Firebase Console:
1. Go to **Authentication**
2. Click **Sign-in method** tab
3. Enable **Anonymous** authentication
4. Click **Save**

### 5. Test Locally

```bash
npm run dev
```

Visit http://localhost:5173/TrackContract/ and verify:
- ✅ No Firebase errors in console
- ✅ You can add contractions
- ✅ Data persists after page refresh

### 6. Commit and Deploy

```bash
git add src/config/firebaseConfig.ts
git commit -m "feat: Add Firebase configuration"
git push
```

The GitHub Actions workflow will automatically deploy to GitHub Pages!

---

## Why This is Safe

Your Firebase config is **safe to commit** to public repositories because:

1. **Not a secret** - The "API key" is just a project identifier
2. **Security via Rules** - Your Firestore Security Rules protect your data
3. **Industry standard** - All Firebase apps expose this config
4. **Can't be abused** - Even with your config, attackers can't access user data

The config is like a phone number - it identifies your Firebase project but doesn't grant access to data.

---

## Troubleshooting

### "Firebase is not configured" error

Make sure you replaced ALL placeholder values in `firebaseConfig.ts`. Check that none of the values contain `YOUR_`.

### "Missing or insufficient permissions" error

Your Firestore Security Rules need to be set up. Follow Step 3 above.

### "Auth error" in console

Enable Anonymous Authentication in Firebase Console (Step 4 above).

---

## Next Steps

Once deployed, you can:
- Share the app with family/midwife using the share link feature
- Add contractions from multiple devices
- Everything syncs in real-time!
