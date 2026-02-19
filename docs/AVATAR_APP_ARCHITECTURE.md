# AI Avatar App – Architecture & Implementation Plan

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP (Expo / React Native)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Photo        │  │ 3D Avatar    │  │ Clothing     │  │ User Profile &       │  │
│  │ Capture      │  │ Viewer       │  │ Try-On       │  │ Avatar Cache         │  │
│  │ (Face+Body)  │  │ (R3F/WebView)│  │ Overlay      │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────┼─────────────────────┼──────────────┘
          │                 │                 │                     │
          ▼                 │                 │                     ▼
┌──────────────────────────┼─────────────────┼─────────────────────────────────────┐
│              API GATEWAY (Node.js / Express)                                       │
│  ┌──────────────────────┼─────────────────┼──────────────────────────────────┐   │
│  │  /upload    /avatar  /try-on    /profile    Auth middleware (JWT)          │   │
│  └──────────────────────┼─────────────────┼──────────────────────────────────┘   │
└─────────────────────────┼─────────────────┼──────────────────────────────────────┘
          │                │                │
          ▼                │                │
┌─────────────────────────┼─────────────────┼──────────────────────────────────────┐
│  S3 (Raw images)        │   PostgreSQL    │   AI PIPELINE (Python FastAPI)        │
│  - face_uploads/        │   - users       │   ┌────────────────────────────────┐  │
│  - body_uploads/        │   - avatars     │   │ 1. Face detection & extraction │  │
│  - avatars/ (GLB)       │   - clothing    │   │ 2. Pose estimation             │  │
│  - clothing/            │   - sessions    │   │ 3. 3D mesh generation (SMPL)   │  │
└─────────────────────────┼─────────────────┴────│ 4. Texture mapping            │  │
                          │                      │ 5. GLB export                 │  │
                          │                      └────────────────────────────────┘  │
                          │                                     │                    │
                          │                      ┌───────────────▼──────────────┐    │
                          │                      │  GPU Worker (optional)       │    │
                          │                      │  - CUDA for inference        │    │
                          └─────────────────────►  - Redis queue for jobs       │    │
                                                 └──────────────────────────────┘    │
```

**Data flow:**
1. User uploads face + body → Node API stores in S3, creates job in queue
2. AI pipeline processes images → face landmarks, pose, 3D mesh, textures
3. GLB file generated → stored in S3, reference saved in PostgreSQL
4. Mobile app fetches GLB URL → renders in 3D viewer, applies clothing overlays

---

## 2. AI Pipeline (Step-by-Step)

| Step | Task | Model / Approach | Output |
|------|------|------------------|--------|
| 1 | **Face detection & alignment** | MediaPipe Face Mesh / RetinaFace | 468 face landmarks, cropped face image |
| 2 | **Face texture extraction** | Crop + segment (MediaPipe Selfie Segmentation) | Clean face texture (512×512) |
| 3 | **Body pose estimation** | MediaPipe Pose / OpenPose | 33 body landmarks |
| 4 | **Body proportion estimation** | Landmarks → SMPL params (e.g. PIXIE, FrankMocap) | SMPL betas (10), thetas (72) |
| 5 | **3D mesh generation** | SMPL / SMPL-X | Base mesh (6890 vertices) |
| 6 | **Texture mapping** | UV unwrap + project face/body texture | Textured mesh |
| 7 | **Export** | trimesh / pygltflib | GLB file |

**MVP simplification:** For MVP, consider **2.5D avatar** (single view with texture) instead of full parametric SMPL if latency/cost is critical. Full SMPL adds complexity (license, heavy compute).

---

## 3. Folder Structure

### Frontend (Expo / React Native)

```
TryOn/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx           # Home / camera
│   │   ├── profile.tsx         # Avatar viewer
│   │   └── shop.tsx            # Clothing try-on
│   └── _layout.tsx
├── components/
│   ├── camera/
│   │   ├── FaceCapture.tsx
│   │   └── BodyCapture.tsx
│   ├── avatar/
│   │   ├── AvatarViewer.tsx    # WebView or R3F for 3D
│   │   ├── RotationSlider.tsx
│   │   └── ClothingOverlay.tsx
│   └── ui/
├── services/
│   ├── api.ts                  # Axios / fetch wrapper
│   ├── upload.ts               # S3 presigned upload
│   └── avatar.ts               # Avatar CRUD
├── hooks/
│   └── useAvatar.ts
├── assets/
├── app.json
└── package.json
```

### Backend (Node.js)

```
avatar-api/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── upload.ts
│   │   ├── avatar.ts
│   │   ├── clothing.ts
│   │   └── auth.ts
│   ├── services/
│   │   ├── s3.ts
│   │   ├── aiClient.ts         # Call Python AI service
│   │   └── queue.ts            # Bull / SQS
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── upload.ts
│   └── db/
│       ├── schema.sql
│       └── migrations/
├── Dockerfile
└── package.json
```

### AI Pipeline (Python FastAPI)

```
avatar-ai/
├── app/
│   ├── main.py                 # FastAPI app
│   ├── config.py
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── face.py             # Face detection, texture
│   │   ├── pose.py             # Pose estimation
│   │   ├── mesh.py             # SMPL / mesh gen
│   │   ├── texture.py          # UV + texture mapping
│   │   └── export.py           # GLB export
│   └── models/                 # Cached model weights
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 4. Recommended AI Models (2025)

| Use Case | Model | License | Notes |
|----------|-------|---------|-------|
| Face detection/landmarks | **MediaPipe Face Mesh** | Apache 2.0 | Fast, 468 landmarks, works on CPU |
| Face detection (accuracy) | **RetinaFace** | MIT | More accurate, needs GPU for speed |
| Body pose | **MediaPipe Pose** | Apache 2.0 | 33 landmarks, real-time |
| 3D body model | **SMPL / SMPL-X** | Research license | Standard, need to register |
| SMPL from image | **FrankMocap** / **PIXIE** | MIT | Image → SMPL params |
| Texture synthesis | **PIFuHD** (optional) | Research | Full 3D from image, heavy |
| Face texture | Crop + inpainting (optional) | - | Simple: direct crop; Advanced: LaMa inpainting |

**MVP recommendation:**
- **Face:** MediaPipe Face Mesh + direct crop for texture
- **Pose:** MediaPipe Pose
- **3D:** Start with **rigged humanoid GLB template** + landmark-driven deformation, or use **FrankMocap** if GPU available
- **Texture:** Project cropped face/body onto template UVs

---

## 5. Step-by-Step MVP Implementation

### Phase 1: Foundation (Week 1)
- [ ] Set up Node API: Express, PostgreSQL, S3 client, JWT auth
- [ ] Set up Python FastAPI: basic endpoints, S3 read
- [ ] Mobile: photo capture flow (face + body), upload to API
- [ ] S3 buckets: raw uploads, processed avatars

### Phase 2: AI Pipeline v1 (Week 2)
- [ ] Face detection + crop (MediaPipe)
- [ ] Pose estimation (MediaPipe)
- [ ] Store landmarks as JSON
- [ ] Endpoint: `POST /process` → returns landmarks (no 3D yet)

### Phase 3: 3D Avatar (Week 3)
- [ ] Parametric mesh: SMPL template or simple humanoid GLB
- [ ] Deform mesh from pose landmarks (simplified rigging)
- [ ] Project face texture onto head UV
- [ ] Export GLB, upload to S3

### Phase 4: Mobile 3D Viewer (Week 4)
- [ ] WebView with Three.js or expo-three / react-three-fiber
- [ ] Load GLB from URL, render
- [ ] Rotation slider (0–360°)
- [ ] Save avatar to user profile

### Phase 5: Clothing Try-On (Week 5)
- [ ] Clothing as overlay (2D sprite or simple 3D mesh)
- [ ] UV/position mapping from avatar
- [ ] Basic garment library (tshirt, pants, etc.)

### Phase 6: Polish (Week 6)
- [ ] Caching, re-generation option
- [ ] Error handling, loading states
- [ ] Privacy: image retention policy, user consent

---

## 6. Example Code Snippets

### 6.1 Mobile – Upload flow

```typescript
// services/upload.ts
import * as FileSystem from 'expo-file-system';

export async function uploadImage(uri: string, type: 'face' | 'body') {
  const { presignedUrl } = await api.post('/upload/presign', { type });
  await FileSystem.uploadAsync(presignedUrl, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  return presignedUrl.split('?')[0]; // Return S3 key/URL
}
```

### 6.2 Node API – Create avatar job

```javascript
// routes/avatar.js
router.post('/generate', auth, async (req, res) => {
  const { faceUrl, bodyUrl } = req.body;
  const job = await queue.add('avatar-generation', {
    userId: req.user.id,
    faceUrl,
    bodyUrl,
  });
  res.json({ jobId: job.id, status: 'queued' });
});
```

### 6.3 Python – Face + pose pipeline

```python
# pipeline/face.py
import mediapipe as mp

def extract_face(texture_image_path: str) -> dict:
    mp_face = mp.solutions.face_mesh.FaceMesh(static_image_mode=True)
    image = cv2.imread(texture_image_path)
    results = mp_face.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    landmarks = results.multi_face_landmarks[0] if results.multi_face_landmarks else None
    # Crop face using landmarks, return texture
    return {"landmarks": landmarks, "texture_path": cropped_path}
```

```python
# pipeline/pose.py
def estimate_pose(body_image_path: str) -> dict:
    mp_pose = mp.solutions.pose.Pose(static_image_mode=True)
    image = cv2.imread(body_image_path)
    results = mp_pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    return {"landmarks": results.pose_landmarks}
```

### 6.4 React Native – 3D viewer (WebView)

```tsx
// components/avatar/AvatarViewer.tsx
import { WebView } from 'react-native-webview';

const html = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<div id="canvas"></div>
<script>
  const scene = new THREE.Scene();
  const loader = new THREE.GLTFLoader();
  loader.load(avatarUrl, (gltf) => {
    scene.add(gltf.scene);
    // ... render loop, rotation from postMessage
  });
</script>
`;

export function AvatarViewer({ avatarUrl, rotation }) {
  const webRef = useRef();
  useEffect(() => {
    webRef.current?.injectJavaScript(`window.setRotation(${rotation});`);
  }, [rotation]);
  return <WebView ref={webRef} source={{ html }} />;
}
```

---

## 7. Scaling Strategy (100k Users)

| Component | Strategy |
|-----------|----------|
| **API (Node)** | Horizontal scaling (ECS/K8s), 2–4 instances behind ALB |
| **AI (Python)** | Separate workers, auto-scale on queue depth (2–10 GPU instances) |
| **Queue** | Redis (Bull) or AWS SQS for job distribution |
| **S3** | Infinite scale, use CDN (CloudFront) for GLB delivery |
| **PostgreSQL** | RDS read replicas, connection pooling (PgBouncer) |
| **Caching** | Redis for avatar URLs, session data |
| **Rate limiting** | Per-user limits on /generate, /upload |

**Cost drivers:** GPU for AI, S3 storage, egress. Optimize by:
- Caching generated avatars (avoid re-run)
- WebP/compressed GLB
- Batch processing during off-peak

---

## 8. Cost Estimation Overview

| Item | Est. monthly (10k active users) |
|------|---------------------------------|
| Node API (2× t3.medium) | ~$60 |
| Python AI (1× g4dn.xlarge GPU) | ~$350 |
| PostgreSQL RDS (db.t3.medium) | ~$60 |
| S3 storage (100GB) | ~$2.50 |
| S3 requests + egress | ~$20 |
| Redis (ElastiCache small) | ~$15 |
| **Total** | **~$500/mo** |

At 100k users: ~$2–4k/mo with 5–10 GPU workers, larger DB, CDN.

---

## Tradeoffs & MVP Decisions

| Decision | MVP Choice | Alternative | Rationale |
|----------|-----------|-------------|-----------|
| 3D model | Template + landmark deform | Full SMPL from image | Faster to ship, SMPL needs GPU + license |
| Face texture | Direct crop | AI inpainting / PIFuHD | Simpler, good enough for MVP |
| Mobile 3D | WebView + Three.js | expo-three / react-three-fiber | WebView = no native deps, easier |
| AI runtime | FastAPI on same VM | Lambda + SageMaker | Single service = simpler ops |
| Clothing | 2D overlay / billboard | Full 3D garment sim | 2D is feasible; 3D needs more R&D |

---

## Next Steps

1. Validate SMPL/FrankMocap licensing for your use case.
2. Run MediaPipe locally to confirm quality on your target images.
3. Start with Phase 1–2: upload + landmark extraction only.
4. Add 3D only when landmarks look good and you have a clear UX for rotation and try-on.
