# 🌸 Our Wedding Memories Gallery

A beautiful, professional, and full-stack digital wedding guestbook and media gallery. Inspired by products like **Immich**, **Apple Photos**, and **Pinterest**, this application is designed specifically for wedding events with an elegant, polished glassmorphism theme, real-time social interactions, and granular coordinator controls.

---

## ✨ Features

- 📸 **Seamless Media Uploads**: Fast, multi-file drag-and-drop, folder uploads, and mobile camera rolling.
- ⚡ **EXIF & Metadata Parsing**: Client-side parsing of resolution, duration, and camera equipment profiles (e.g. iPhone, Sony Alpha, DJI Drone) to keep server memory clean.
- 🎨 **Premium Visual Identity**: Balanced typography pairings ("Playfair Display" and "Inter") with glowing Rose Gold accents, glassmorphic card widgets, blur effects, and smooth animations.
- 📦 **Bento Grid Ceremony Folders**: Categorize wedding moments into specialized event albums (e.g., *Haldi*, *Mehendi*, *Sangeet*, *Vows*, *Reception toasts*, *Candid smiles*).
- 🛎️ **Real-Time Notification Hub**: Bells with unread badges alerting guests when their uploads are liked, commented on, or approved.
- 🛡️ **Granular Coordinator Deck (Admin)**: Full-featured administrator dashboard with custom SVG growth charts, storage radial dials, moderation queues, activity logs, and account creation controls.
- 🔗 **QR Code Portal**: Click to display an SVG QR code that links directly to the app URL, enabling wedding guests to transition instantly from laptops to mobile phone cameras.
- 💾 **Durable Volume Mounts**: Standardized file structure under `/data` for robust, painless single-container backups.

---

## 🚀 Quick Start (Docker Compose)

### 1. Requirements
Ensure you have **Docker** and **Docker Compose** installed on your server.

### 2. Run Commands
Boot the entire multi-container service (Express App + Nginx Reverse Proxy) by running:
```bash
docker-compose up -d --build
```

The application will build, configure itself, and run on port **80** (proxied through Nginx).

---

## 👤 Default Accounts (Pre-Seeded)

The system automatically initializes and seeds two user accounts during the first database bootstrap:

| Username | Password | Display Name | System Role |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | *The Wedding Host* | **Admin** (Full Dashboard & Moderation) |
| **`guest`** | `guest123` | *Honored Guest* | **User** (Browse, Like, Comment & Upload) |

> 🔒 *Note: Administrators can disable user accounts, modify guest display names, delete uploads, and reset passwords directly from the Admin Panel.*

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite, TypeScript, Tailwind CSS, Lucide Icons, Custom SVG charts)
- **Backend**: Node.js & Express
- **Database**: Local File-Backed Transaction-Safe JSON Store (with transactional locks, atomic writes, and Repository patterns)
- **Authentication**: JWT Token signing with salt-hashed bcrypt passwords
- **Upload Engine**: Multer (Local disk storage capped at 100MB per file)
- **Reverse Proxy**: Nginx (Alpined, with `client_max_body_size 100M` and gzip enabled)

---

## 🗄️ Swapping to AWS S3, Cloudflare R2, or MinIO

The application is architected around the **Repository Pattern** and a decoupled media layer. If you want to connect cloud object storage instead of local disk storage later:

1. **Multer S3 Config**: Swap `multer.diskStorage` inside `server.ts` to `multer-s3`:
   ```typescript
   import { S3Client } from '@aws-sdk/client-s3';
   import multerS3 from 'multer-s3';

   const s3 = new S3Client({ region: 'us-east-1' });
   const upload = multer({
     storage: multerS3({
       s3: s3,
       bucket: 'wedding-memories-bucket',
       key: (req, file, cb) => cb(null, `uploads/${Date.now()}-${file.originalname}`)
     })
   });
   ```
2. **Retrieve URLs**: In `MemoryViewer.tsx` and image grids, replace `/uploads/${m.filename}` with your CDN or S3 bucket URL.

---

## 📡 API Endpoints Summary

### 🔑 Authentication
- `POST /api/auth/login` - Authenticates guest, returns JWT token.
- `GET /api/auth/me` - Validates session token, returns active user details.
- `PUT /api/auth/profile` - Edits user display name and selects preset avatars.
- `PUT /api/auth/change-password` - Updates user password.

### 🖼️ Memories & Media
- `GET /api/memories` - Returns search/filtered gallery assets.
- `POST /api/memories/upload` - Handles multi-part files uploads with EXIF metadata.
- `DELETE /api/memories/:id` - Deletes memory upload (owner or coordinator only).
- `POST /api/memories/:id/like` - Toggles like statuses on pictures/videos.
- `GET /api/memories/:id/download` - Downloads original high-resolution files.

### 💬 Social Actions
- `GET /api/memories/:id/comments` - Returns all comments.
- `POST /api/memories/:id/comments` - Adds comment to a memory.
- `DELETE /api/memories/:id/comments/:commentId` - Deletes comment.

### 📂 Albums & Ceremonies
- `GET /api/albums` - Returns all wedding event folder categories.
- `POST /api/albums` - Creates custom album folder (Admin).
- `PUT /api/albums/:id` - Updates album description/name (Admin).
- `DELETE /api/albums/:id` - Deletes album folder (Admin).

### 🛡️ Dashboard & Coordination (Admin Only)
- `GET /api/admin/stats` - Returns stats (Upload counts, total storage, SVG line trend data, memory usage).
- `GET /api/admin/logs` - Returns complete system activity security audit logs.
- `GET /api/admin/users` - Lists all user accounts.
- `POST /api/admin/users` - Creates new guest account.
- `PUT /api/admin/users/:id` - Edits details or resets credentials of a user account.
- `DELETE /api/admin/users/:id` - Deletes user account.
- `PUT /api/settings` - Updates global wedding titles or turns on/off upload moderation checks.

---

## 🌸 Developed with Love

This application is designed to be fully responsive, accessible, secure, and lightning-fast. Perfect for celebrating your special day!
