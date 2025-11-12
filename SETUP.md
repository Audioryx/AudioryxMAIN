# Audioryx Pro Template — Setup Guide

## Overview
This template contains:
- `frontend/` — desktop glassmorphic UI (HTML/CSS/JS)
- `backend/` — Node.js/Express server (JWT auth + uploads) using SQLite (local file)
- `.env.example` — environment variables example

> This is a **safe template**. No secrets are included. Set your own `JWT_SECRET` in `.env`.

---

## Quick local run (backend)
1. Install Node (v16+ recommended).
2. Open terminal:
```
cd backend
npm install
cp .env.example .env
# edit .env and set JWT_SECRET
npm start
```
3. Backend runs at `http://localhost:4000/`. It serves uploads at `/uploads/...`.

## Frontend
Open `frontend/index.html` in a browser. For best results, serve the `frontend/` directory with a static server or place it behind the backend:
```
# simple static server
npx http-server frontend -p 3000
# then open http://localhost:3000
```
If you want the frontend to talk to the backend on the same origin, set `API_BASE` in `frontend/config.js` to `http://localhost:4000`.

## Deploying
- Push `backend/` to a Git repo and deploy to Render / Railway / Heroku. Set the environment variable `JWT_SECRET` there.
- Serve `frontend/` on GitHub Pages (static) or from the backend (express.static).

---

## Notes
- This template stores uploads on disk (`backend/uploads/`). For production, use S3 or similar.
- For production DB consider Postgres. Replace SQLite with Postgres and update queries.
- This is a starting point — you should review security, CORS, rate-limits before public use.
