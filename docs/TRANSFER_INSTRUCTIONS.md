# Transfer & Migration Guide

Follow these steps to move the FOLK CRM to a new development environment like **Cursor** or **Google Project IDX**.

## 1. Local Download (Zip)
If you want a single file backup:
1. Open the **Terminal** in Firebase Studio.
2. Run: `zip -r project.zip . -x "node_modules/*" ".next/*" ".git/*"`
3. Right-click `project.zip` in the sidebar and select **Download**.

## 2. Obtaining Firebase Admin Credentials
To use the CRM in external environments, you need the **Admin Service Account** keys:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `spiritual-gemv1-39818720-c204b`.
3. Click the **Gear icon (Settings)** > **Project Settings**.
4. Go to the **Service Accounts** tab.
5. Click **Generate New Private Key**. A JSON file will download.
6. Open this JSON and use the values for `project_id`, `client_email`, and `private_key` in your environment variables.

## 3. GitHub Upload (Recommended)
To keep your code synced and versions tracked:
1. Create a repository on [GitHub](https://github.com/new).
2. Open the **Terminal** and run:
   ```bash
   # Fix existing locks and re-init
   rm -f .git/config.lock
   git init
   git add .
   git commit -m "Initial commit from Studio"
   
   # Link to your repo (replace with your URL)
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## 4. Setting up in Cursor / VS Code
1. **Extract** your zip file OR `git clone` your repo.
2. **Environment Variables**: Create a `.env.local` file using `.env.example` as a template.
   ```env
   # Client Config
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=spiritual-gemv1-39818720-c204b
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spiritual-gemv1-39818720-c204b.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...

   # Admin Config (from JSON in Step 2)
   FIREBASE_PROJECT_ID=spiritual-gemv1-39818720-c204b
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```
3. **Install**: Run `npm install`.
4. **Dev**: Run `npm run dev`.

## 5. Troubleshooting Git Lock
If you see `failed to write new configuration file .git/config.lock`:
- Run `rm -rf .git` to start over with a fresh Git history.
- Run `git init` and follow the steps in Section 3.
