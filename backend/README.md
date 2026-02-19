# Avatar API (Node.js)

## Run

```bash
npm install
npm start
```

Server: `http://localhost:3001`

## Endpoints

- `POST /avatar/jobs` – multipart: `face`, `body` (images)
- `GET /avatar/jobs/:jobId` – job status
- `GET /static/avatars/:id.glb` – generated avatar file
