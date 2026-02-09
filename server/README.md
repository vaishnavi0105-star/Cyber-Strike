# Cyber Strike API

Backend for **signup**, **signin**, and storing **level scores** (and leaderboard).

## Setup

```bash
cd server
npm install
```

## Run

```bash
npm start
```

Runs at **http://localhost:3001** (or `PORT` env var).

## Project structure

```
server/
  config/           # Configuration and DB connect
    index.js
    database.js
  controllers/      # Request handlers
    healthController.js
    authController.js
    profileController.js
    gameController.js
    leaderboardController.js
  middleware/
    auth.js         # JWT auth
  models/
    User.js         # Mongoose User model
  routes/
    index.js        # Mounts all API routes under /api
    healthRoutes.js
    authRoutes.js
    profileRoutes.js
    gameRoutes.js
    leaderboardRoutes.js
  app.js            # Express app (middleware + routes)
  server.js         # Entry: connect DB, then start app
```

## MongoDB

The API uses **MongoDB** for storage. Install MongoDB locally or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier).

- **Local:** install MongoDB and run it, then use default URI or set `MONGODB_URI`.
- **Atlas:** create a cluster, get a connection string, set `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/test`.

## Environment (optional)

- `PORT` — server port (default `3001`)
- `MONGODB_URI` — MongoDB connection string (default `mongodb://127.0.0.1:27017/test`)
- `JWT_SECRET` — secret for JWT tokens (set in production)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | `{ username, password }` → create account, returns `{ token, user }` |
| POST | `/api/auth/signin` | No | `{ username, password }` → returns `{ token, user }` |
| GET | `/api/profile` | Bearer | Returns current user's progress |
| PUT | `/api/profile` | Bearer | `{ bestScore?, highestUnlockedLevel? }` — update progress |
| POST | `/api/game/record` | Bearer | `{ score, levelCleared?, level? }` — record level complete or game over |
| GET | `/api/leaderboard?limit=10` | No | Top scores for landing page |
| GET | `/api/health` | No | Health check — returns `ok`, `service`, `version`, `uptime`, `timestamp`, `db.status` |

Data is stored in **MongoDB** (database `test`, collection `users`).

## Enabling the API in the game

Before the game script loads, set the API base URL:

```html
<script>window.CYBER_STRIKE_API_URL = "http://localhost:3001";</script>
<script src="game.js"></script>
```

If `CYBER_STRIKE_API_URL` is not set, the game uses **localStorage only** (no server, no password).
