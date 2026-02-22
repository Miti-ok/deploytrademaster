# Railway Deployment Guide

This repo is a monorepo:
- `backend/` = FastAPI API
- `frontend/` = Vite React app

## 1. Deploy backend to Railway

1. Create a new Railway project and connect this repo.
2. Keep service root at repo root (Railway uses `railway.json`).
3. Set backend environment variables:
   - `GROQ_API_KEY`
   - `AI_MODEL` (optional)
   - `VISION_MODEL` (optional)
   - `VISION_FALLBACK_MODEL` (optional)
4. Deploy. Railway starts:
   - `cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}`
5. Verify health:
   - `GET /` should return backend status JSON.

## 2. Deploy frontend (optional)

You can deploy frontend as a second Railway service or any static host (Vercel/Netlify).

Frontend env vars:
- `VITE_API_BASE_URL=https://<your-backend-domain>.up.railway.app`
- `VITE_MAPBOX_TOKEN=<your-mapbox-token>`

For Railway frontend service, use:
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`

