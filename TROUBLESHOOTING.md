# 🔧 Troubleshooting Permission Denied Errors

## Quick Fix Steps

### 1. **Deploy Firebase Rules (Most Important)**
```bash
# Run this in your project directory
./deploy-rules.sh
```

Or manually:
```bash
firebase login
firebase deploy --only firestore:rules
```

### 2. **Test Permissions**
1. Go to the Admin Panel in your game
2. Click "Test Firebase Permissions"
3. Check the browser console for detailed results

### 3. **Check Authentication Status**
- Look at the authentication status in the main lobby
- Should show "✅ Authenticated as: [user-id]..."
- If it shows "❌ Authentication failed", refresh the page

## Common Issues & Solutions

### Issue 1: "Permission denied" when joining games
**Cause**: Firebase security rules are too restrictive
**Solution**: Deploy the new `firestore.rules` file

### Issue 2: "Authentication failed"
**Cause**: Firebase auth not working properly
**Solution**: 
1. Refresh the page
2. Check browser console for auth errors
3. Try in incognito/private mode

### Issue 3: "Game not found"
**Cause**: Game ID doesn't exist or was deleted
**Solution**: 
1. Check the Game ID is correct
2. Create a new game instead
3. Use the "Browse Available Games" feature

## Debug Information

### Check Browser Console
Open Developer Tools (F12) and look for:
- Authentication messages
- Firebase errors
- Permission test results

### Test Steps
1. **Create a game** - Should work if auth is working
2. **Join a game** - Should work if rules are deployed
3. **Browse games** - Should show available games
4. **Admin panel** - Should show database stats

## Emergency Fix

If nothing else works, you can temporarily disable all security rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hangman-multiplayer-6e30f`
3. Go to Firestore Database → Rules
4. Replace all rules with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
5. Click "Publish"

⚠️ **Warning**: This makes your database completely open. Only use for testing!

## Still Having Issues?

1. Check the browser console for specific error messages
2. Try the "Test Firebase Permissions" button in Admin Panel
3. Verify your Firebase project ID is correct in `index.html`
4. Make sure you're using the latest version of the code
