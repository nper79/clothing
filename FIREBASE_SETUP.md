# Firebase Setup Guide

This guide will help you set up Firebase Authentication for Google Sign-In in your StyleAI application.

## Prerequisites

- A Google account
- Node.js and npm installed
- Your StyleAI project cloned locally

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter your project name (e.g., "StyleAI" or "clothing-ai-stylist")
4. Choose your location preferences
5. Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, go to your project
2. Click "Authentication" in the left sidebar
3. Click "Get started" on the Authentication page
4. In the "Sign-in method" tab, click on "Google"
5. Enable the Google provider
6. Add your project's email address for support
7. Click "Save"

## Step 3: Configure Web App

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Under "Your apps", click the web icon (`</>`) to add a web app
4. Enter your app nickname (e.g., "StyleAI Web")
5. Click "Register app"
6. Copy the Firebase configuration object (you'll need this for your .env file)

## Step 4: Add Authorized Domains

1. In Project Settings, scroll down to "Your apps" section
2. Click on your web app
3. Under "Firebase SDK snippet", click "Config"
4. Scroll down to "Authorized domains"
5. Add your development domain (e.g., `localhost:5173` for Vite)
6. Add your production domain when deployed

## Step 5: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration in the `.env` file:

   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Gemini API Key
   VITE_API_KEY=your_gemini_api_key_here
   ```

   Replace the placeholder values with your actual Firebase configuration from Step 3.

## Step 6: Install Dependencies

If you haven't already, install Firebase:

```bash
npm install firebase
```

## Step 7: Test the Configuration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:5173`
3. You should see the landing page
4. Click "Continue with Google" to test the authentication

## Troubleshooting

### Common Issues

1. **"Invalid domain" error**
   - Make sure your development domain (`localhost:5173` or your port) is added to authorized domains in Firebase Console

2. **"API key not valid" error**
   - Double-check that your API key is correctly set in the `.env` file
   - Ensure you're using the web API key, not the server key

3. **Google Sign-In popup blocked**
   - Make sure popups are allowed for your development domain
   - Check browser's popup blocker settings

4. **Environment variables not working**
   - Ensure your `.env` file is in the project root
   - Restart your development server after changing environment variables
   - Make sure variables start with `VITE_` for Vite projects

### Debug Tips

- Check the browser console for detailed error messages
- Verify Firebase configuration in Project Settings
- Ensure Google Sign-In is enabled in Authentication settings
- Test in an incognito window to rule out cache issues

## Production Deployment

When deploying to production:

1. Add your production domain to Firebase authorized domains
2. Set up environment variables in your hosting provider
3. Ensure your domain is properly configured for HTTPS (required for Firebase Auth)
4. Test the authentication flow in your production environment

## Security Considerations

- Never commit your `.env` file to version control
- Use environment-specific API keys when possible
- Regularly rotate your API keys
- Monitor authentication usage in Firebase Console

## Need Help?

If you encounter any issues:

1. Check the [Firebase Documentation](https://firebase.google.com/docs/auth/web/google-signin)
2. Review the browser console for specific error messages
3. Ensure all configuration steps are completed correctly
4. Test with a fresh browser session to rule out caching issues