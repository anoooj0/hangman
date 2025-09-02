Hangman Multiplayer – Deploying to Vercel

Quick start
- Install Vercel CLI (optional): `npm i -g vercel`
- From this folder, run: `vercel` (first time) then `vercel --prod` for production.

Firebase configuration
- Client-side config in `index.html` is fine; protect data via Firestore Rules.
- In Firebase Console:
  - Authentication → Sign-in method → Anonymous: Enable
  - Authentication → Settings → Authorized domains: add your Vercel domain(s) and preview URLs
  - Firestore → Rules: do not use open rules. Use the minimal or hardened rules discussed.

App Check (recommended)
- Enable App Check for Web (reCAPTCHA v3/Enterprise)
- Register your Vercel domain(s)
- Add the site key to your app if enforcing App Check

Local testing
- Start a local server: `python3 -m http.server 5500` then open http://localhost:5500
- Use a separate browser or Incognito for a second player

Notes
- This is a static app; `vercel.json` is included for static hosting.
- Firestore long-polling is enabled for network compatibility.

Post-deploy smoke test
- Open the Vercel URL in two sessions
- Create a game in tab A, join from tab B
- Only host sees the Set Word screen
- Letter buttons are enabled only for the current turn
- Firestore reads/writes succeed under your rules


