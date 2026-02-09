# CYBER STRIKE — ARCADE SHOOTER GAME  
## Project Report (Black Book)  
### Academic Project Submission

---

**Project Title:** Cyber Strike — A Browser-Based Arcade Shooter Game with User Authentication and Leaderboard  

**Submitted by:** Mrs. Vaishnavi Thakur  
**Roll No.:** 23TIT164  
**Course:** TYBSC-IT — Bachelor of Science (Information Technology)  
**College:** Nirmala Memorial Foundation College of Commerce and Science (Autonomous)  
**University:** [University Name]  
**Academic Year:** 2024–25  
**Semester:** V  
**Guide:** Mrs. Shallu Khanna  

---

## Certificate

This is to certify that the project entitled **“Cyber Strike — A Browser-Based Arcade Shooter Game with User Authentication and Leaderboard”** is a bonafide record of work carried out by **Mrs. Vaishnavi Thakur** under the guidance of **Mrs. Shallu Khanna** in partial fulfilment of the requirements for the award of **Bachelor of Science (Information Technology)** in **Information Technology** from **Nirmala Memorial Foundation College of Commerce and Science (Autonomous)** during the academic year **2024–25**.

<br/>  
**[Guide Signature]**  
**Mrs. Shallu Khanna**  
**[Designation]**  

<br/>  
**[HOD Signature]**  
**Head of Department of Information Technology**  

---

## Declaration

I, **Mrs. Vaishnavi Thakur**, hereby declare that the project work entitled **“Cyber Strike — A Browser-Based Arcade Shooter Game with User Authentication and Leaderboard”** submitted to **Nirmala Memorial Foundation College of Commerce and Science (Autonomous)** is a record of genuine work done by me under the supervision of **Mrs. Shallu Khanna**. This work has not been submitted elsewhere for the award of any other degree/diploma.

<br/>  
**Place:** _____________  
**Date:** _____________  
**Signature:** _____________  

---

## Acknowledgement

I would like to express my sincere gratitude to **Mrs. Shallu Khanna** for her guidance and support throughout the project. I am thankful to **[HOD Name]** and the faculty of **Nirmala Memorial Foundation College of Commerce and Science (Autonomous)** for providing the necessary resources. I also thank my family and friends for their encouragement during the completion of this project.

---

## Table of Contents

1. [Introduction](#1-introduction)  
2. [Problem Statement](#2-problem-statement)  
3. [Objectives](#3-objectives)  
4. [Scope of the Project](#4-scope-of-the-project)  
5. [Technologies Used](#5-technologies-used)  
6. [System Analysis and Design](#6-system-analysis-and-design)  
7. [Implementation](#7-implementation)  
8. [Testing](#8-testing)  
9. [Results and Screenshots](#9-results-and-screenshots)  
10. [Conclusion](#10-conclusion)  
11. [Future Scope](#11-future-scope)  
12. [References](#12-references)  

---

## 1. Introduction

### 1.1 Overview

**Cyber Strike** is a browser-based 2D arcade shooter game built with HTML5, CSS3, and JavaScript. The game features multiple levels, boss fights, power-ups, and a full backend with user authentication and a global leaderboard. It is designed to run in modern web browsers without any installation, making it easily accessible for players.

### 1.2 Need for the Project

- **Entertainment and learning:** Combines game design with web technologies and full-stack development.  
- **No installation:** Runs entirely in the browser; no app store or download required.  
- **Multi-device:** Works on desktops and devices with a supported browser.  
- **Academic relevance:** Demonstrates front-end (HTML/CSS/JS), back-end (Node.js, Express), database (MongoDB), and REST API design.

### 1.3 Features at a Glance

- User registration and login (JWT-based authentication)  
- Multiple game levels with increasing difficulty  
- Boss battles at the end of each level  
- Power-ups (triple shot, shield) and extra life pickups  
- Persistent progress (best score, highest unlocked level)  
- Global leaderboard with rank, player name, score, and level progress  
- Settings (player name, sound toggle)  
- Responsive UI with a consistent cyber-themed design  

---

## 2. Problem Statement

To develop a **browser-based arcade shooter game** that:

1. Allows users to **create accounts** and **log in** securely.  
2. **Saves progress** (best score, unlocked levels) on the server.  
3. Displays a **leaderboard** of top players with their scores and level progress.  
4. Provides a **smooth, engaging gameplay** experience with multiple levels and boss fights.  
5. Works **without installation** and is accessible from any device with a modern browser.  

---

## 3. Objectives

- To design and implement a 2D arcade shooter game using HTML5 Canvas and JavaScript.  
- To build a REST API (Node.js + Express) for authentication, profile, and game data.  
- To store user and game data in MongoDB and integrate it with the front-end.  
- To implement JWT-based authentication for secure access to user-specific data.  
- To create a leaderboard that shows top scores and level completion status.  
- To ensure a consistent, responsive UI and good user experience across the application.  

---

## 4. Scope of the Project

| Module            | Scope                                                                 |
|-------------------|-----------------------------------------------------------------------|
| **Front-end**     | Landing page, level selection, game canvas, HUD, game over/level complete overlay, settings, leaderboard page. |
| **Back-end**      | Signup, signin, profile (GET/PUT), game record (POST), leaderboard (GET), health check. |
| **Database**      | User collection: username, displayName, passwordHash, bestScore, highestUnlockedLevel. |
| **Authentication** | JWT tokens; password hashing with bcrypt.                           |
| **Deployment**    | Can be run locally (front-end as static files, back-end on Node, MongoDB local or Atlas). |

---

## 5. Technologies Used

### 5.1 Front-end

| Technology   | Purpose                                      |
|-------------|-----------------------------------------------|
| **HTML5**   | Structure, Canvas for game rendering, semantic markup. |
| **CSS3**    | Layout, animations, responsive design, theming. |
| **JavaScript (ES6+)** | Game logic, DOM handling, API calls, event handling. |

### 5.2 Back-end

| Technology   | Purpose                                      |
|-------------|-----------------------------------------------|
| **Node.js** | Server runtime.                              |
| **Express.js** | REST API, routing, middleware.             |
| **MongoDB** | Database for users and game-related data.    |
| **Mongoose** | ODM for MongoDB; schemas and models.        |
| **JWT (jsonwebtoken)** | Token-based authentication.           |
| **bcryptjs** | Secure password hashing.                    |
| **dotenv**  | Environment variables (e.g. PORT, MONGODB_URI, JWT_SECRET). |
| **CORS**    | Allow browser requests from the game origin.  |

### 5.3 Tools

- **Version control:** Git  
- **Browser:** Any modern browser (Chrome, Firefox, Edge, Safari)  
- **API testing:** Postman / browser DevTools  
- **Database:** MongoDB (local or MongoDB Atlas)  

---

## 6. System Analysis and Design

### 6.1 Architecture Overview

The system follows a **client–server** architecture:

- **Client:** Static HTML/CSS/JS served (or opened as file). Game and UI run in the browser.  
- **Server:** Node.js + Express providing REST APIs.  
- **Database:** MongoDB storing user accounts and progress.  

```
┌─────────────────┐      HTTP/HTTPS       ┌─────────────────┐      ┌──────────────┐
│   Browser       │  ◄──────────────────►  │  Node.js        │  ◄─► │  MongoDB     │
│   (HTML/CSS/JS) │   REST API (JSON)     │  Express        │      │  (test DB)   │
└─────────────────┘                       └─────────────────┘      └──────────────┘
```

### 6.2 Use Case Diagram (High-Level)

- **Player:** Sign up, Log in, Select level, Play game, View leaderboard, Update settings, View own profile (best score, unlocked levels).  
- **System:** Validate credentials, store/retrieve user data, update best score and unlocked level, serve leaderboard.  

### 6.3 Data Flow

1. **Sign up / Sign in:** Client sends credentials → Server validates → Creates/finds user in MongoDB → Returns JWT and user info.  
2. **Profile:** Client sends JWT in `Authorization` header → Server verifies JWT → Fetches user from DB → Returns profile.  
3. **Game record:** After game over/level complete, client sends score and level info with JWT → Server updates user’s best score and unlocked level → Returns updated profile.  
4. **Leaderboard:** Client requests leaderboard → Server queries MongoDB (sort by best score, limit) → Returns list of display name, score, level progress.  

### 6.4 Database Schema (MongoDB)

**Collection: `users`**

| Field                  | Type   | Description                          |
|------------------------|--------|--------------------------------------|
| _id                    | ObjectId | Auto-generated unique ID.          |
| username               | String | Unique, lowercase, required.         |
| displayName            | String | Name shown in leaderboard.          |
| passwordHash           | String | Bcrypt hash, required.               |
| highestUnlockedLevel   | Number | 1–5, default 1.                     |
| bestScore              | Number | Default 0.                           |
| createdAt              | Date   | Set by Mongoose timestamps.          |

### 6.5 API Specification

| Method | Endpoint             | Auth  | Description                    |
|--------|----------------------|-------|--------------------------------|
| POST   | /api/auth/signup     | No    | Register; returns token, user. |
| POST   | /api/auth/signin     | No    | Login; returns token, user.    |
| GET    | /api/profile         | Bearer| Current user profile.          |
| PUT    | /api/profile         | Bearer| Update best score / level.     |
| POST   | /api/game/record     | Bearer| Record game over/level clear.  |
| GET    | /api/leaderboard     | No    | Top scores (?limit=10).       |
| GET    | /api/health          | No    | Health check (service, DB).   |

---

## 7. Implementation

### 7.1 Project Structure

```
cyber-strike/
├── index.html              # Landing + game container
├── leaderboard.html        # Leaderboard page
├── game.js                 # Game logic, API calls, UI
├── style.css               # Global and game styles
├── assets/                 # Audio (MP3)
├── server/
│   ├── server.js           # Entry: DB connect + start app
│   ├── app.js              # Express app, routes
│   ├── config/
│   │   ├── index.js        # PORT, MONGODB_URI, JWT_SECRET
│   │   └── database.js     # Mongoose connect
│   ├── models/
│   │   └── User.js         # User schema
│   ├── controllers/        # auth, profile, game, leaderboard, health
│   ├── routes/             # Mounted under /api
│   └── middleware/
│       └── auth.js         # JWT verification
└── docs/
    └── BLACK_BOOK_PROJECT_REPORT.md
```

### 7.2 Front-end Implementation

- **Landing:** Level cards, login/sign up, toolbar (leaderboard, settings). Level lock/unlock and “Completed” based on `highestUnlockedLevel`.  
- **Game:** Canvas-based loop (draw, update, collision). Player, enemies, bullets, boss, power-ups, lives. Levels 1–5 with different timings and boss health.  
- **Overlay:** Game over / level complete with “Play Again”, “Next Level”, “Back to menu” (after delay).  
- **API usage:** `CYBER_STRIKE_API_URL` set (e.g. `http://localhost:3001`) enables signup, signin, profile fetch, game record, and leaderboard; otherwise game uses localStorage only.  

### 7.3 Back-end Implementation

- **Config:** Environment variables (via `dotenv`) for PORT, MONGODB_URI, JWT_SECRET.  
- **Database:** Mongoose connects at startup; server listens only after successful connection.  
- **Auth:** Middleware reads `Authorization: Bearer <token>`, verifies JWT, loads user by `userId` (MongoDB `_id`), attaches to `req.user`.  
- **Controllers:** Signup (hash password, create user), signin (compare password, issue JWT), profile (get/update), game record (update score/level), leaderboard (query, sort, limit), health (uptime, DB status).  

### 7.4 Security Aspects

- Passwords hashed with **bcrypt** (no plain-text storage).  
- **JWT** for stateless authentication; token sent in header only.  
- **CORS** configured so only allowed origins can call the API.  
- **Input validation** on signup/signin (username, password length, etc.).  

---

## 8. Testing

- **Manual testing:** Sign up, login, play levels, game over, level complete, leaderboard, settings.  
- **API testing:** Use Postman/curl for each endpoint (with/without token, invalid token).  
- **Browser:** Test in Chrome, Firefox, Edge; check console for errors and network for 401/500.  
- **Database:** Verify user documents and fields in MongoDB after signup and after game record.  

*(You can add a short “Test Cases” table here with steps and expected results for submission.)*

---

## 9. Results and Screenshots

*(Insert screenshots in the printed report. Suggested captions below.)*

1. **Landing page** — Level selection, Login/Sign up, toolbar.  
2. **Login / Sign up popup** — Name and password fields.  
3. **Gameplay** — In-game view with HUD (score, level, lives).  
4. **Level complete overlay** — “Next Level” / “Play Again” and score.  
5. **Game over overlay** — “Play Again” and “Back to menu.”  
6. **Leaderboard page** — Table with rank, player, score, level progress.  
7. **Settings panel** — Player name and sound toggle.  

---

## 10. Conclusion

The project **“Cyber Strike”** successfully implements a browser-based arcade shooter with a Node.js backend and MongoDB. It demonstrates:

- Game development using HTML5 Canvas and JavaScript.  
- Design and use of a REST API for auth and game data.  
- Secure authentication (JWT, bcrypt) and persistent storage (MongoDB).  
- Integration of front-end and back-end with a clear separation of concerns.  

The application is functional, scalable in structure, and suitable for extension with more levels, features, or deployment to a hosted environment.

---

## 11. Future Scope

- Add more levels, enemy types, and power-ups.  
- Multiplayer or real-time leaderboard updates (e.g. WebSockets).  
- Deploy front-end and API on a cloud platform (e.g. Vercel, Render, AWS).  
- Add achievements and badges.  
- Mobile-friendly touch controls and PWA support.  

---

## 12. References

1. MDN Web Docs — HTML5 Canvas, JavaScript. https://developer.mozilla.org/  
2. Express.js Documentation. https://expressjs.com/  
3. Mongoose Documentation. https://mongoosejs.com/  
4. JWT Introduction. https://jwt.io/introduction  
5. MongoDB Manual. https://www.mongodb.com/docs/  

---

*[End of Project Report]*

**Note:** Replace remaining placeholders ([University Name], [HOD Name], signature/designation lines) with your actual details before submission. Add screenshots in Section 9 and, if required, expand the Testing section with a test case table.
