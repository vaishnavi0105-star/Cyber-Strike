# 🎮 Cyber Strike — Arcade Shooter

A retro arcade-style shooter game with user authentication, leaderboards, and progressive difficulty levels. Play online, track your scores, and compete on the leaderboard!

## ✨ Features

- 🎯 **4 Challenging Levels** - Deep Space Patrol, Dusk Skies, Milky Way Rift, Cyber Dimension
- 👤 **User Authentication** - Sign up, login, and save your progress
- 🏆 **Global Leaderboard** - Compete with other players
- 🔊 **Dynamic Sound** - Web Audio API + MP3 effects
- 📱 **Responsive Design** - Play on desktop and mobile
- ⚡ **Progressive Difficulty** - Enemies get faster and smarter
- 💾 **Score Persistence** - Your scores sync to the server

---

## 🚀 Quick Start

### Local Development

#### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas account)
- npm or yarn

#### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cyber-strike
   ```

2. **Setup frontend** (root directory)
   ```bash
   # No build needed - just serve the files locally
   # Open index.html in a browser or use a local server:
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

3. **Setup backend** (server directory)
   ```bash
   cd server
   npm install
   ```

4. **Configure environment** - Edit `server/.env`:
   ```dotenv
   MONGODB_URI=mongodb+srv://user:password@cluster.xxxxx.mongodb.net/?appName=CyberStrike
   PORT=3001
   JWT_SECRET=your-strong-secret-key-here
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:3001`

6. **Play the game**
   - Open `index.html` in your browser
   - Create an account or login
   - Select a level and start playing!

---

## 📁 Project Structure

```
cyber-strike/
├── index.html              # Main game screen
├── leaderboard.html        # Leaderboard page
├── game.js                 # Game logic & frontend
├── style.css               # Styling
├── vercel.json             # Deployment config
├── DEPLOYMENT.md           # Deployment guide
│
├── server/                 # Node.js backend
│   ├── server.js           # Entry point
│   ├── app.js              # Express app
│   ├── package.json        # Dependencies
│   ├── .env                # Environment variables
│   ├── config/             # Configuration
│   │   ├── database.js     # MongoDB connection
│   │   └── index.js        # App config
│   ├── controllers/        # Route handlers
│   │   ├── authController.js
│   │   ├── gameController.js
│   │   ├── leaderboardController.js
│   │   ├── profileController.js
│   │   └── healthController.js
│   ├── models/             # Data models
│   │   └── User.js
│   ├── routes/             # API routes
│   │   ├── authRoutes.js
│   │   ├── gameRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   └── profileRoutes.js
│   └── middleware/         # Auth middleware
│       └── auth.js
│
└── docs/                   # Documentation
    ├── TECH_DOCUMENTATION.md
    └── BLACK_BOOK_PROJECT_REPORT.md
```

---

## 🎮 How to Play

1. **Start Game** - Click "Login" or "Sign Up"
2. **Choose Level** - Select from 4 difficulty levels
3. **Controls**:
   - **Arrow Keys / Touch Buttons** - Move
   - **Spacebar / FIRE Button** - Shoot
   - **M Key** - Mute/Unmute sound
4. **Survive** - Defeat enemies, collect power-ups
5. **Score** - Beat levels to unlock the next one
6. **Leaderboard** - Check your rank globally

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Login

### Game
- `POST /api/game/scores` - Submit level score
- `GET /api/game/profile` - Get user profile

### Leaderboard
- `GET /api/leaderboard` - Get top 10 scores
- `GET /api/leaderboard/:level` - Get level-specific leaderboard

### Health
- `GET /api/health` - Server status check

---

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to **Vercel**.

### Quick Deploy
1. Push to GitHub
2. Go to https://vercel.com
3. Import repository
4. Add environment variables
5. Deploy!

---

## 🔐 Security

- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ CORS enabled
- ✅ Environment variables for secrets
- ⚠️ Change `JWT_SECRET` in production

---

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (no frameworks)
- Canvas API for graphics
- Web Audio API for sound
- LocalStorage for tokens

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Bcryptjs for password hashing

**Deployment:**
- Vercel (serverless)
- MongoDB Atlas (database)

---

## 📝 Environment Variables

### Server (.env)
```env
MONGODB_URI=mongodb+srv://user:password@cluster.xxxxx.mongodb.net/
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
```

---

## 🐛 Troubleshooting

### Game won't load
- Check browser console for errors
- Verify server is running: `npm start` in `/server`
- Ensure MongoDB connection string is correct

### API calls failing
- Verify `MONGODB_URI` in `.env`
- Check firewall/port 3001 is accessible
- Test with: `curl http://localhost:3001/api/health`

### Leaderboard empty
- Check MongoDB is connected
- Verify scores are being submitted
- Check server logs for errors

---

## 📚 Resources

- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Express.js Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Vercel Docs](https://vercel.com/docs)

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

Built with passion for arcade gaming!

Need help? Check [DEPLOYMENT.md](DEPLOYMENT.md) or open an issue on GitHub.
