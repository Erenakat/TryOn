# Avatar MVP – End-to-End Setup

## Overview

When the user uploads **both** face and body images and taps **"Lagre Profil"**:

1. Images are validated and uploaded (multipart/form-data, no manual Content-Type)
2. Backend creates a job and returns `{ jobId }`
3. App polls `GET /avatar/jobs/:jobId` every 2s (up to 3 min)
4. When `status: "done"`, `avatarUrl` points to the GLB file
5. App renders the 3D avatar with rotation controls (0–360°)
6. User can save avatar to profile (AsyncStorage)

## Quick Start

### 1. Start Backend

```bash
cd backend
npm install
npm start
```

Backend runs at `http://localhost:3001`.

### 2. Start Mobile App

```bash
cd ..
npx expo start
```

- **iOS Simulator**: Uses `localhost:3001`
- **Android Emulator**: Uses `10.0.2.2:3001`
- **Physical device**: Edit `src/config.js` and set `DEV_API_HOST` to your machine's LAN IP (e.g. `http://192.168.1.100:3001`)

### 3. Test Flow

1. Add face image (tap Fjes → camera or gallery)
2. Add body image (tap Fullkropp → camera or gallery)
3. Tap **"Lagre Profil"**
4. Wait for "Generating avatar…" (2–10s)
5. 3D placeholder avatar appears with rotation buttons
6. Tap **"Lagre avatar til profil"** to persist

## API Spec

### POST /avatar/jobs

- **Content-Type**: `multipart/form-data` (do NOT set manually in React Native)
- **Fields**: `face` (image), `body` (image)
- **Response**: `{ jobId: string }`

### GET /avatar/jobs/:jobId

- **Response**: `{ jobId, status: "queued"|"processing"|"done"|"failed", progress?: number, avatarUrl?: string, error?: string }`

### Static Files

- Avatars: `GET /static/avatars/:id.glb`

## Happy Path Test

1. Backend running on port 3001
2. App running in simulator/emulator
3. Select face + body images
4. Tap "Lagre Profil"
5. See "Generating avatar…" with progress
6. See 3D avatar (placeholder box) with rotation
7. Rotate with < > buttons
8. Tap "Lagre avatar til profil"
9. Restart app → avatar loads from storage

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Kunne ikke opprette avatar" | Backend not running / wrong URL | Start backend; check `src/config.js` |
| Poll timeout | Backend crashed or job failed | Check backend logs; verify GLB generator |
| Images not uploading | FormData Content-Type set manually | Remove any `Content-Type` header on fetch |
| Blank 3D viewer | CORS or wrong avatarUrl | Ensure avatarUrl is full URL (`http://.../static/avatars/xxx.glb`) |
| Android "Network request failed" | Cleartext HTTP blocked | `usesCleartextTraffic: true` in app.json |
