# Supabase Setup Guide

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up/login with GitHub
4. Create new project: `clothing-ai-style`
5. Choose region closest to your users
6. Set database password (save it!)
7. Click "Create new project"

### 2. Get Your Credentials
After project creation, go to:
- **Project Settings** → **API**
- Copy **Project URL** and **anon public** key

### 3. Run the SQL Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy contents of `supabase-schema.sql`
4. Paste and click "Run"

### 4. Configure Environment Variables
Create `.env` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 5. Update the App
Replace the imports in `App.tsx`:

```typescript
// Change from:
import { initializeUserProfile, updateProfileFromFeedback, saveUserProfile, loadUserProfile } from './services/preferenceService';

// To:
import { initializeUserProfile, updateProfileFromFeedbackCloud, saveUserProfileCloud, loadUserProfileCloud } from './services/preferenceServiceCloud';
import { syncService } from './services/syncService';
```

## 📊 What You Get

### ✅ **Cloud Features**
- **Multi-device sync**: Your style profile follows you everywhere
- **Data persistence**: Never lose your preferences
- **Offline support**: Works without internet, syncs when back online
- **Analytics**: Track your style evolution over time

### 🔧 **Database Tables**
- `user_profiles`: Style vectors, color preferences
- `user_feedback`: Detailed feedback history
- `user_analytics`: Style evolution metrics
- **RLS Security**: Users can only access their own data

### 🔄 **Sync Features**
- **Real-time sync**: Changes instantly saved to cloud
- **Offline queue**: Works offline, syncs when online
- **Conflict resolution**: Smart merging of preferences
- **Status indicators**: Visual sync status

## 🎯 Next Steps

### Optional: Enable Email Auth
If you want user accounts instead of anonymous:

1. **In Supabase Dashboard**:
   - Go to **Authentication** → **Settings**
   - Enable "Enable email confirmations"
   - Add your site URL to "Site URL"

2. **Update AuthService**:
   ```typescript
   // Replace getCurrentUser() with real auth
   const { data: { user } } = await supabase.auth.getUser();
   ```

### Optional: Add Row Level Security
The schema already includes RLS policies. Users can only access their own data automatically.

## 🚨 Troubleshooting

### **"CORS policy error"**
- Add your frontend URL to Supabase CORS settings
- Go to **Project Settings** → **API** → **CORS**

### **"Permission denied" errors**
- Check RLS policies in SQL schema
- Ensure user is authenticated (even anonymous users)

### **"Sync not working"**
- Check browser console for errors
- Verify Supabase URL and keys in `.env`
- Check network connection

### **"Schema doesn't exist"**
- Make sure you ran the SQL schema
- Check table names match exactly

## 📈 Monitoring

### **View Your Data**
- In Supabase dashboard, go to **Table Editor**
- Browse `user_profiles` and `user_feedback`
- See how the AI learns from preferences

### **Analytics Dashboard**
The SQL schema includes analytics views:
```sql
SELECT * FROM user_analytics WHERE user_id = 'your-user-id';
```

---

**That's it! 🎉 Your Clothing AI now has cloud sync with offline support!**