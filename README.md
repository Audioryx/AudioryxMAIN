Audioryx Pro - Full production package
=====================================

Folders:
 - frontend/  -> UI (index.html, styles.css, script.js, assets/)
 - backend/   -> Node/Express server (server.js, package.json, .env.example)

Quick local run (backend):
  cd backend
  npm install
  cp .env.example .env
  # edit .env and set JWT_SECRET, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD
  npm start

Frontend:
  - Set API_BASE at top of frontend/config.js to your backend URL if backend is remote.
  - The frontend will try to fetch /api/* endpoints relative to API_BASE or same origin.

Deployment:
 - Replit: upload backend folder + secrets, press Run.
 - Railway: connect repo and set environment variables.
 - Render: create a Web Service, set build/start commands, set env vars.

Notes:
 - Employee login is hidden behind the keyboard shortcut: Command + Option + Shift + E
 - Guest login button lets users enter without creating an account.
