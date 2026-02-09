# Cyber Strike — Technical Documentation (Developer Guide)

This document is for developers who need to **understand the project architecture**, **run the application**, and **explain it to others**. After reading it, you should be able to set up the project, navigate the codebase, and describe how the game and API work end-to-end.

---

## 1. Project Overview

**Cyber Strike** is a browser-based 2D arcade shooter with:

- **Frontend:** HTML, CSS, and vanilla JavaScript. The game runs in a `<canvas>` with a landing page (level select, login/signup), in-game HUD, and a separate leaderboard page.
- **Backend:** Node.js + Express API for user accounts (signup/signin), profile progress, and leaderboard. Data is stored in **MongoDB**.
- **Modes:** The game can run **with or without** the server. Without the API, it uses localStorage-only profiles (no passwords). With the API (e.g. `http://localhost:3001`), users sign in with password and scores/progress sync to the server.

---

## 2. Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  index.html          game.js              leaderboard.html               │
│  • Landing (levels)   • Canvas game        • Fetches /api/leaderboard    │
│  • Login/Sign up      • API: auth,         • Renders top scores           │
│  • Level select         profile, record    • Same style.css                │
│  • Settings          • Profiles (local or API)                            │
│  style.css           • 5 levels, boss, power-ups, sound                   │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │
                                │ HTTP (fetch) — only when CYBER_STRIKE_API_URL is set
                                │ • POST /api/auth/signup, /api/auth/signin
                                │ • GET  /api/profile (Bearer token)
                                │ • PUT  /api/profile (Bearer token)
                                │ • POST /api/game/record (Bearer token)
                                │ • GET  /api/leaderboard?limit=N
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NODE.JS SERVER (Express)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  server.js  →  app.js  →  routes (under /api)                             │
│  • Connects to MongoDB first; exits if DB fails                           │
│  • CORS enabled (origin: true), express.json()                            │
│  • /api/health, /api/auth, /api/profile, /api/game, /api/leaderboard      │
│  • JWT auth middleware on profile + game/record                           │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │
                                │ mongoose
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MONGODB                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Database: test (default)                                                 │
│  Collection: users                                                        │
│  • username, passwordHash, displayName                                    │
│  • highestUnlockedLevel (1–5), bestScore                                  │
│  • Index on bestScore (-1) for leaderboard queries                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Summary:** The browser hosts the game and UI. If `window.CYBER_STRIKE_API_URL` is set (e.g. on localhost it’s set to `http://localhost:3001`), the game uses the API for auth and persisting scores/levels; otherwise it uses only localStorage. The server is a REST API with JWT auth and a single `User` model in MongoDB.

---

## 3. Tech Stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript, Canvas 2D API, Web Audio API |
| Backend     | Node.js, Express |
| Database    | MongoDB (Mongoose ODM) |
| Auth        | JWT (jsonwebtoken), bcrypt for password hashing |
| Dev / Run   | No build step; static files + `node server.js` |

---

## 4. Repository Structure

```
cyber-strike/
├── index.html              # Main entry: landing, level select, login, game wrapper
├── leaderboard.html        # Leaderboard page (uses /api/leaderboard)
├── style.css               # Global styles (landing, game, modals, leaderboard)
├── game.js                 # Game logic, canvas, API client, profiles, levels 1–5
├── assets/                 # Audio: intro, shoot, powerup, player-hit, extra-life, gameover
├── docs/
│   ├── BLACK_BOOK_PROJECT_REPORT.md
│   └── TECH_DOCUMENTATION.md   # This file
└── server/                 # Node.js API
    ├── server.js           # Entry: load dotenv, connect DB, then app.listen
    ├── app.js              # Express app: cors, json, mount /api routes
    ├── config/
    │   ├── index.js        # PORT, MONGODB_URI, JWT_SECRET from env
    │   └── database.js     # connectDB() (mongoose.connect)
    ├── middleware/
    │   └── auth.js         # JWT verify, attach req.user
    ├── models/
    │   └── User.js         # Mongoose schema (username, passwordHash, progress)
    ├── controllers/
    │   ├── healthController.js
    │   ├── authController.js    # signup, signin
    │   ├── profileController.js # getProfile, updateProfile
    │   ├── gameController.js    # recordGame
    │   └── leaderboardController.js # getLeaderboard
    ├── routes/
    │   ├── index.js        # Mounts /health, /auth, /profile, /game, /leaderboard
    │   ├── healthRoutes.js
    │   ├── authRoutes.js
    │   ├── profileRoutes.js
    │   ├── gameRoutes.js
    │   └── leaderboardRoutes.js
    ├── .env.example
    ├── .env                # Not committed; copy from .env.example
    └── package.json
```

---

## 5. Prerequisites

- **Node.js** (v16+ recommended) and **npm**
- **MongoDB** running locally, or a **MongoDB Atlas** connection string

---

## 6. How to Run

### 6.1 MongoDB

- **Local:** Install MongoDB and start it (e.g. `mongod`). Default URI used by the server: `mongodb://127.0.0.1:27017/test`.
- **Atlas:** Create a cluster, get a connection string, and set `MONGODB_URI` in `server/.env`.

### 6.2 Backend (API)

```bash
cd server
cp .env.example .env   # Edit .env if needed (MONGODB_URI, JWT_SECRET)
npm install
npm start
```

- Server listens on **http://localhost:3001** (or `PORT` from `.env`).
- If MongoDB is not reachable, the process exits with an error.

### 6.3 Frontend (Game)

- Open the game in a browser **as static files** (no build step):
  - Option A: Open `index.html` directly (file://). API will not be used unless you set `window.CYBER_STRIKE_API_URL` manually (e.g. in DevTools). Best for quick local-only testing.
  - Option B (recommended): Use a simple static server from the **project root** so the same origin or hostname rules apply. Example:

```bash
# From project root (cyber-strike/)
npx serve -l 3000
# Then open http://localhost:3000
```

- On **localhost / 127.0.0.1**, `index.html` and `leaderboard.html` already set `window.CYBER_STRIKE_API_URL = "http://localhost:3001"`, so the game will use the API when the server is running.

### 6.4 Quick “full stack” check

1. Start MongoDB.
2. In one terminal: `cd server && npm start`.
3. In another: from project root run `npx serve -l 3000` and open **http://localhost:3000**.
4. Sign up on the landing page, choose a level, play; then open the Leaderboard. You should see your score and progress.

---

## 7. Environment Variables (Server)

| Variable      | Default | Description |
|---------------|--------|-------------|
| `PORT`        | `3001` | Server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/test` | MongoDB connection string |
| `JWT_SECRET`  | (dev default in code) | Secret for signing JWT; **must** set in production |

Copy `server/.env.example` to `server/.env` and adjust. The app loads env via `dotenv` in `server.js`.

---

## 8. API Reference

All API routes are under the **`/api`** prefix. Base URL example: `http://localhost:3001`.

### 8.1 Health (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check. Returns `ok`, `service`, `version`, `uptime`, `timestamp`, `db.status`. |

### 8.2 Auth (no auth)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | `{ "username": string, "password": string }` | Create account. Username trimmed and lowercased. Password min 4 chars. Returns `{ token, user }`. |
| POST | `/api/auth/signin` | `{ "username": string, "password": string }` | Login. Returns `{ token, user }`. |

**User object in response:** `id`, `username`, `displayName`, `highestUnlockedLevel`, `bestScore`.

The client stores the **token** (e.g. in `localStorage` under `cyberStrikeAuthTokenV1`) and sends it as:

```http
Authorization: Bearer <token>
```

### 8.3 Profile (Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Current user's profile (same shape as auth response). |
| PUT | `/api/profile` | Body: `{ bestScore?: number, highestUnlockedLevel?: number }`. Only updates if values are better (score) or valid (level 1–5). Returns updated `{ highestUnlockedLevel, bestScore }`. |

### 8.4 Game record (Bearer token required)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/game/record` | `{ score: number, levelCleared?: boolean, level?: number }` | Updates user’s `bestScore` if `score` is higher; if `levelCleared === true` and `level` < 5, unlocks `level + 1`. Returns `{ highestUnlockedLevel, bestScore }`. |

### 8.5 Leaderboard (no auth)

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/leaderboard` | `limit` (default 10, max 100) | Top users by `bestScore`. Returns `{ leaderboard: [ { displayName, bestScore, highestUnlockedLevel }, ... ] }`. |

---

## 9. Frontend Architecture (Game & UI)

### 9.1 Entry and API detection

- **index.html** loads `game.js` and, on localhost, sets `window.CYBER_STRIKE_API_URL = "http://localhost:3001"`.
- **game.js** defines `API_BASE` from `window.CYBER_STRIKE_API_URL`. If `API_BASE` is set, the game uses the API for signup/signin and for syncing scores and levels; otherwise it uses **localStorage-only** profiles (no password).

### 9.2 Auth and profiles

- **Token:** Stored in `localStorage` under `cyberStrikeAuthTokenV1`. Sent as `Authorization: Bearer <token>` on profile and game/record requests.
- **Profiles (local):** Stored in `localStorage` under `cyberStrikeProfilesV1`. Each key is a profile name; value is `{ highestUnlockedLevel, bestScore }`. When API is used, the current user is synced from `/api/profile` and written back via `/api/game/record` and optionally `/api/profile`.
- **Landing:** Level cards 1–5 are locked/unlocked/completed based on `highestUnlockedLevel`. User selects a level and clicks “Start Level” to enter the game.

### 9.3 Game flow (game.js)

- **Constants:** `MAX_LEVEL = 5`. Level config (e.g. backgrounds, difficulty) is keyed by `currentLevel`.
- **Screens:** Landing → (optional level intro) → Start screen (click or SPACE) → main game loop. On game over or level complete, an overlay is shown with “Play Again” / “Next Level” / “Home”.
- **Game loop:** `requestAnimationFrame(gameLoop)`. Updates player, enemies, bullets, power-ups, collision, score, lives, and boss logic per level.
- **Progress recording:**
  - **Level cleared:** `recordLevelClearProgress()` updates local profile and, if API is used, calls `POST /api/game/record` with `{ score, levelCleared: true, level }`.
  - **Game over:** `recordGameOverProgress()` updates best score locally and, if API is used, calls `POST /api/game/record` with `{ score, levelCleared: false, level }`.
- **Levels 1–5:** Each level has its own theme and boss. Beating the boss on level 5 triggers “YOU WIN!”. Beating a level before 5 unlocks the next and shows “Next Level”.

### 9.4 Leaderboard page

- **leaderboard.html** fetches `GET /api/leaderboard?limit=50`. If `CYBER_STRIKE_API_URL` is not set, it shows a message that the server is required. It renders a table: rank, player name (`displayName`), score, and level progress badges (L1–L5 completed/unlocked/locked).

---

## 10. Data Model (MongoDB)

**Collection:** `users` (Mongoose model `User`).

| Field | Type | Notes |
|-------|------|--------|
| `username` | String | Required, unique, lowercase, trimmed. |
| `displayName` | String | Default "". Shown on leaderboard. |
| `passwordHash` | String | Required; bcrypt. |
| `highestUnlockedLevel` | Number | Default 1, min 1, max 5. |
| `bestScore` | Number | Default 0, min 0. |
| `timestamps` | true | `createdAt`, `updatedAt`. |

**Index:** `{ bestScore: -1 }` for efficient leaderboard queries.

---

## 11. Key Flows (Summary)

1. **Sign up:** User enters name + password → `POST /api/auth/signup` → server creates user, returns JWT and user → client stores token and sets current profile from `user`.
2. **Sign in:** User enters name + password → `POST /api/auth/signin` → client stores token and loads profile (e.g. `GET /api/profile` or from signin response).
3. **Load progress:** On landing, if token exists, client can call `GET /api/profile` to set `highestUnlockedLevel` and `bestScore` and update level locks.
4. **During game:** On level clear or game over, client calls `POST /api/game/record` with score and level info; server updates `bestScore` and `highestUnlockedLevel` and returns updated values.
5. **Leaderboard:** Any client (no auth) calls `GET /api/leaderboard?limit=N` and displays top users by `bestScore`.

---

## 12. How to Explain the Project to Others

You can use these points to present or demo the project:

1. **What it is:** A 2D browser arcade shooter (Canvas) with 5 levels, bosses, power-ups, and sound. It has a landing page with level select and optional login, and a separate leaderboard page.
2. **Optional backend:** The game works offline with localStorage-only profiles. When the Node API is running and the game is opened from a host that sets `CYBER_STRIKE_API_URL`, users can sign up/sign in and their best score and unlocked levels are stored in MongoDB and shown on the leaderboard.
3. **Stack:** Frontend: HTML/CSS/JS and Canvas; Backend: Node, Express, JWT auth, MongoDB (Mongoose). No frontend framework or build step.
4. **Run it:** Start MongoDB, run `npm start` in `server/`, serve the project root (e.g. `npx serve -l 3000`), open the app in the browser, sign up, play a level, then open the leaderboard to see scores.
5. **Security:** Passwords are hashed with bcrypt; API uses JWT for protected routes (profile and game record). Leaderboard and auth endpoints are public by design.

---

## 13. Troubleshooting

| Issue | What to check |
|-------|----------------|
| "Cannot reach server" in game | Ensure API is running (`cd server && npm start`) and `CYBER_STRIKE_API_URL` points to it (e.g. `http://localhost:3001`). |
| Leaderboard shows "Could not load" | Same as above; ensure `GET http://localhost:3001/api/leaderboard` is reachable (CORS is enabled). |
| MongoDB connection failed | MongoDB running locally or valid `MONGODB_URI` in `server/.env`. |
| 401 on profile or game/record | Token missing or expired. Log in again; token is valid 7 days. |
| Levels not unlocking | Server updates `highestUnlockedLevel` only when `levelCleared: true` and `level` < 5. Check that the client sends `levelCleared` and `level` correctly in `POST /api/game/record`. |

---

*End of Technical Documentation. For academic submission details, see `docs/BLACK_BOOK_PROJECT_REPORT.md`.*
