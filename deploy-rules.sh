#!/bin/bash

echo "🚀 Deploying Firebase Security Rules..."
echo "This will fix the permission denied errors."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
firebase login --no-localhost

# Deploy the rules
echo "📤 Deploying security rules..."
firebase deploy --only firestore:rules

echo "✅ Rules deployed! The permission denied errors should now be fixed."
echo "🔄 Please refresh your browser and try joining a game again."
