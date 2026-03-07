# Next Steps: Getting Google Auth Working

## Step 1 — Enable Google Sign-In in Firebase Console

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and open your project
2. In the left sidebar: **Authentication** → **Sign-in method**
3. Click **Google** → toggle **Enable** → click **Save**
4. Go to **Authentication** → **Settings** → **Authorized domains**
5. Make sure `deereeco.github.io` is in the list. If not, click **Add domain** and add it.

---

## Step 2 — Deploy Firestore Security Rules

You don't have `firebase.json` yet, so you'll need to set up the Firebase CLI once.

**Install Firebase CLI (if you haven't):**
```bash
npm install -g firebase-tools
```

**Login and initialize:**
```bash
firebase login
firebase init firestore
```

When prompted:
- "Use an existing project" → select your Firebase project
- "What file should be used for Firestore Rules?" → type `firestore.rules`
- "What file should be used for Firestore indexes?" → press Enter to accept default

**Deploy the rules:**
```bash
firebase deploy --only firestore:rules
```

---

## Step 3 — Test Locally

```bash
npm run dev
```

Work through this checklist in order:

- [ ] Sign-in screen appears — "Sign in with Google" instead of the old app
- [ ] Sign in — Google popup opens, you authenticate, land on the session dashboard
- [ ] Create a session — click "New Session", type "Test", press Enter → enters the tracker
- [ ] Add a contraction — tap Start, wait a few seconds, tap Stop
- [ ] Generate a share link — Settings → "Generate Share Link" → copy it
- [ ] Open the link in a different browser (or incognito) — see "Viewing: Test" banner and the contraction
- [ ] Viewer adds a contraction — it appears on the original device in real-time
- [ ] Reload the viewer tab (no hash in URL) — reconnects automatically without asking for the link again
- [ ] Switch sessions — click the grid icon in the header → back to dashboard → create "Brittany" → open it

---

## Step 4 — Deploy to GitHub Pages

Once local testing passes:

```bash
npm run deploy
```

Then repeat the share link test on the live URL to confirm it works outside localhost.

---

## Known Gotcha: Auth Popup on Live Site

If you see an `auth/unauthorized-domain` error after deploying, go to Firebase Console → Authentication → Settings → Authorized domains and add `deereeco.github.io`.

---

## Known Limitations (future work)

- **Deleting session data** — deleting a session removes the session document but leaves its `contractions` subcollection in Firestore (Firestore doesn't cascade-delete subcollections from the client). Not a bug, just orphaned data. Can be cleaned up later with a Cloud Function.
- **Legacy `#userId=` links** — old-format share links won't display contractions in the new session-based UI. They won't crash, but the data won't appear. New share links work correctly.
