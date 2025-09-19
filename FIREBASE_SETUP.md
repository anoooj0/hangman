# Firebase Setup Instructions

## Fixing Permission Denied Errors

The permission denied errors when joining games are caused by restrictive Firebase security rules. Follow these steps to fix them:

### 1. Deploy the Security Rules

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project directory:
   ```bash
   firebase init firestore
   ```

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 2. Alternative: Update Rules in Firebase Console

If you prefer to use the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hangman-multiplayer-6e30f`
3. Go to Firestore Database → Rules
4. Replace the existing rules with the content from `firestore.rules` file
5. Click "Publish"

### 3. Verify the Rules

The new rules allow:
- **Read access**: Anyone can read game documents (needed for joining games)
- **Write access**: Only authenticated users can create/update/delete games

This should resolve the permission denied errors when joining games.

## Database Management

The app now includes an Admin Panel with the following features:

- **Delete All Games**: Removes all games from the database
- **Delete Completed Games**: Removes only completed games
- **Delete Stale Games**: Removes games older than 30 minutes
- **Database Statistics**: Shows current database state

To access the Admin Panel:
1. Go to the main lobby
2. Click the "Admin Panel" button
3. Use the appropriate delete buttons as needed

## Testing

After deploying the rules:
1. Try creating a new game
2. Try joining a game with the Game ID
3. Check the browser console for any remaining errors
4. The permission denied errors should be resolved
