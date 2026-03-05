# GreenRoute — Journey Emissions Estimator (Node.js / Express / MongoDB / EJS + JSON API)

**Author:** Mateusz Malerek  
**University of Greater Manchester — Assignment project**

GreenRoute is a web application for logging journeys and estimating CO₂e emissions based on distance and a selected transport mode (emission factor). It provides:
- **EJS pages (browser UI)** for users and admins
- **JSON API** endpoints for the same core features

---

## Features

### User (EJS + API)
- Register, log in / log out (session-based)
- Dashboard summary (journeys count + recent emissions + best mode)
- Create journeys and calculate emissions
- List journeys, view details, delete own journey
- Password reset via **6-digit email code** (15-minute expiry)

### Admin (EJS + API)
- Admin dashboard (stats + latest journeys)
- Manage transport modes (create/edit/toggle)
- **Mode deletion blocked if used by any journey** (preserves history)
- Monitor and delete journeys
- Manage users (status changes, delete users + cascade delete journeys)
- Safety rules: cannot change own status; cannot remove the last active admin

---

## Requirements (must have)
- **Node.js (LTS recommended)** + npm
- **MongoDB**:
  - Local MongoDB, or
  - MongoDB Atlas connection string

---

## Dependencies (exact)
Install all dependencies from `package.json`:

    npm install

### Runtime dependencies
- bcrypt
- connect-mongo
- dotenv
- ejs
- express
- express-session
- express-validator
- method-override
- mongoose
- nodemailer

### Dev dependencies (testing)
- cross-env
- jest
- supertest

---

## Setup (step-by-step)

### 1) Install
    git clone <YOUR_REPO_URL>
    cd greenroute
    npm install

### 2) Create `.env` (project root)
Create a file named `.env` in the project root (same level as `app.js`).

Required:
    MONGO_URI=mongodb://127.0.0.1:27017/greenroute
    SESSION_SECRET=replace_this_with_a_long_random_string

Optional (only if you want password reset emails to work):
    EMAIL_USER=example@gmail.com
    EMAIL_APP_PASSWORD=abcd efgh ijkl mnop

Notes:
- The app fails on startup if `MONGO_URI` or `SESSION_SECRET` is missing.
- For Gmail, use a **Google App Password** (not your normal Gmail password).

### 3) Ensure MongoDB is running
Choose one:
- Local MongoDB: make sure the MongoDB service is running, then use the local `MONGO_URI`.
- MongoDB Atlas: paste your Atlas connection string into `MONGO_URI`.

### 4) Seed default transport modes (recommended)
    node seedModes.js

### 5) Create a demo admin user (recommended)
    node createAdmin.js

Demo credentials:
- Email: `admin@greenroute.local`
- Password: `Admin123!`

### 6) Run the app
    npm start

Open:
- http://localhost:3000

---

## Quick Use

### Browser (EJS)
- `/register` → create account
- `/login` → log in
- `/dashboard` → user dashboard
- `/journeys/new` → create journey
- `/journeys` → list journeys
- `/admin/dashboard` → admin dashboard (admin only)

### API (JSON) examples
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/journeys`
- `GET /api/journeys`
- `GET /api/me/dashboard`

---

## Tests (optional)
Run automated tests:

    npm test

What this does:
- Runs Jest with `NODE_ENV=test` (via `cross-env`)
- Uses Supertest for HTTP-level endpoint testing

---

## Troubleshooting

### App crashes on startup
Common causes:
- Missing `.env` variables (`MONGO_URI`, `SESSION_SECRET`)
- MongoDB not running / wrong connection string

### Password reset emails not sending
- Ensure `EMAIL_USER` and `EMAIL_APP_PASSWORD` are set
- Gmail requires a Google **App Password** (2FA enabled)

---

## Notes
- Emissions are stored at creation time (preserves history if admin changes factors later).
- Mode deletion is blocked if referenced by journeys.
- Sessions are stored in MongoDB for consistent login state.