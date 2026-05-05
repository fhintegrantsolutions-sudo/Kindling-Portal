# Firebase Migration Complete! 🔥

Your Kindling Portal has been successfully migrated from PostgreSQL to Firebase Firestore!

## 🎯 What Changed

- ✅ Replaced Drizzle ORM with Firebase Admin SDK
- ✅ Migrated from PostgreSQL to Firestore (NoSQL)
- ✅ Updated all storage queries to use Firestore API
- ✅ Maintained all existing functionality
- ✅ Updated schema with Zod validation (Firestore-compatible)

## 📋 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Create a new project** (or select existing):
   - Click "Add project"
   - Enter project name (e.g., "kindling-portal")
   - Accept terms and create

3. **Enable Firestore Database**:
   - Click "Build" → "Firestore Database"
   - Click "Create database"
   - Choose **"Start in test mode"** (for development)
   - Select your region (e.g., us-central)
   - Click "Enable"

4. **Get Service Account Credentials**:
   - Click the gear icon (⚙️) → "Project settings"
   - Go to "Service accounts" tab
   - Click "Generate new private key"
   - Download the JSON file (e.g., `serviceAccountKey.json`)

### 3. Configure Environment Variables

Edit the `.env` file with your Firebase credentials. You have two options:

**Option A: Use Service Account File Path (Easiest)**
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json
FIREBASE_PROJECT_ID=your-project-id
PORT=5000
NODE_ENV=development
```

**Option B: Use Service Account JSON String**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
PORT=5000
NODE_ENV=development
```

### 4. Seed the Database

Run the seed script to populate Firestore with demo data:

```bash
npm run seed
```

This will create:
- ✓ Demo user (username: `kdavidsh`, password: `demo123`)
- ✓ 6 sample notes (investments)
- ✓ 4 participations for the demo user
- ✓ Sample activities and beneficiaries

### 5. Start the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 🏗️ Project Structure

```
server/
  firebase.ts       ← Firebase Admin SDK initialization
  db.ts            ← Exports Firestore db instance
  storage.ts       ← Firestore queries (replaces Drizzle ORM)
  seed.ts          ← Database seeder for Firestore
  routes.ts        ← API routes (unchanged)
  index.ts         ← Server entry point (unchanged)

shared/
  schema.ts        ← Zod schemas + TypeScript types for Firestore

client/            ← React frontend (unchanged)
```

---

## 🗄️ Firestore Collections

Your data is now stored in these Firestore collections:

- `users` - User accounts
- `notes` - Investment notes
- `participations` - User investments in notes
- `payments` - Payment records
- `beneficiaries` - User beneficiaries
- `documents` - User documents
- `participation_documents` - Documents attached to participations
- `note_registrations` - Registration forms for new opportunities
- `activities` - User activity feed

---

## 🔐 Security (Production)

For production, update Firestore Security Rules:

1. Go to Firebase Console → Firestore Database → Rules
2. Add proper authentication and authorization rules
3. Example rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated server access only
    match /{document=**} {
      allow read, write: if false; // Deny all client access
    }
  }
}
```

Since you're using Firebase Admin SDK (server-side), client-side rules don't affect your app. The Admin SDK has full privileges.

---

## 🐛 Troubleshooting

### Error: "No Firebase credentials found"
- Make sure `.env` file has `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT`
- Check that the file path is correct (use absolute path)

### Error: "PERMISSION_DENIED"
- Ensure Firestore is enabled in Firebase Console
- For development, use "test mode" rules
- Check that service account has proper permissions

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Run `npm run check` to verify TypeScript configuration

---

## 📚 Learn More

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## ✨ Next Steps

1. Install dependencies: `npm install`
2. Set up Firebase project (see instructions above)
3. Configure `.env` with your credentials
4. Run seed script: `npm run seed`
5. Start the app: `npm run dev`
6. Login with demo user (kdavidsh / demo123)

Enjoy your Firebase-powered Kindling Portal! 🚀
