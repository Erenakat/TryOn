# AI Avatar Backend

Genererer avatar fra fjesbilde med MediaPipe.

## Lokalt

```bash
cd ai-backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

API: `POST /avatar` med `file` (image) → svar: `{ success, avatar_base64, error }`

## Deploy til Railway (gratis)

1. Gå til [railway.app](https://railway.app) og logg inn
2. "New Project" → "Deploy from GitHub" (eller "Empty Project")
3. Koble repo eller last opp `ai-backend`-mappen
4. Sett start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy → du får URL som `https://xxx.up.railway.app`

## Deploy til Render (gratis)

1. Gå til [render.com](https://render.com) og logg inn
2. "New" → "Web Service"
3. Koble GitHub-repo, velg `ai-backend` eller rot
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy → URL: `https://xxx.onrender.com`

## App-oppsett

I `src/config.js` sett `API_BASE_URL` til din deploy-URL (f.eks. `https://din-app.up.railway.app`).
