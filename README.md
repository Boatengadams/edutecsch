
# EDUTECSCH - Secure School Management Platform (v2.2.0)

Updated with React 19.2.1 and enhanced security protocols.

## 🛡️ Security Upgrades

### 1. Hardened Dependencies
- **React 19.2.1**: Latest secure framework.
- **Firebase v11**: Updated secure SDK.
- **Node 20**: Cloud Functions runtime.

### 2. Strict Access Control (RBAC)
- **Firestore Rules**: Completely rewritten to enforce strict ownership and schema validation.
    - Students can only write to their own submissions.
    - Teachers are restricted to their assigned classes.
    - Parents only access linked children.
- **Validation**: Data types and required fields are validated at the database level.

### 3. Storage Protection
- **Content Security**: Only valid images, videos (max 50MB), and PDFs (max 10MB) allowed.
- **Isolation**: Users are sandboxed to specific storage paths based on role.

### 4. Build Security
- **Production Safety**: Source maps disabled, console logs stripped, and strict headers enforced in `vite.config.ts`.

## 🚀 Features (Unchanged)
- **Live Classroom**: Real-time interaction.
- **AI Tools**: Gemini-powered planning and grading.
- **Interactive Labs**: Virtual science experiments.

## 📦 Deploy
```bash
npm install
npm run build
firebase deploy
```
