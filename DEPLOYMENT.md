# Vercel Deployment Guide

## ✅ Fixed Setup Issues

1. **Updated `vercel.json`** - Properly routes API calls to your Node.js server
2. **Frontend API routing** - Uses relative paths in production (`/api/...`)
   - Local dev: Points to `http://localhost:3001`
   - Production: Uses Vercel's rewrites to route to server functions

3. **Environment variables** - Configured for production

---

## 📋 Deployment Checklist

### Step 1: Prepare Production Environment Variables

Before deploying, ensure you have:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - A strong, random secret (change from development)
- `NODE_ENV` - Set to `production`

### Step 2: Connect to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Import your repository
3. Select root directory: `.` (current)

### Step 3: Configure Vercel Environment Variables

In Vercel dashboard, add:

```
MONGODB_URI = mongodb+srv://user:password@cluster.xxxxx.mongodb.net/?appName=CyberStrike
JWT_SECRET = your-strong-secret-here-change-this
NODE_ENV = production
PORT = 3001
```

### Step 4: Deploy

- Vercel will auto-detect `vercel.json` and deploy
- Frontend files serve from root
- API calls route to `/api/*` → `server/server.js`

---

## 🔗 How It Works

### Local Development
```
Frontend (localhost:3000 or file://)
    ↓
game.js detects localhost
    ↓
Sets API_BASE = "http://localhost:3001"
    ↓
Calls http://localhost:3001/api/...
    ↓
Express server running on :3001
```

### Production (Vercel)
```
Frontend (cyber-strike.vercel.app)
    ↓
game.js detects production domain
    ↓
Sets API_BASE = "" (empty)
    ↓
Calls /api/... (relative paths)
    ↓
Vercel rewrites /api/* to server/server.js
    ↓
Serverless function handles requests
```

---

## 🚀 Deployment Steps

### Using Vercel CLI (Optional)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel --prod

# Add env vars (interactive)
vercel env add MONGODB_URI
vercel env add JWT_SECRET
```

### Using Vercel Dashboard (Recommended)

1. Visit https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure environment variables
5. Click "Deploy"

---

## ✨ Testing After Deployment

After deployment:

1. **Frontend loads?** - Visit your Vercel domain
2. **API works?** - Open browser console, check for fetch errors
3. **Signup/Login?** - Try signing up with a test account
4. **Leaderboard?** - Check if scores are syncing

---

## 🔧 Troubleshooting

### API Calls Fail
- Check Vercel Environment Variables in dashboard
- Verify `MONGODB_URI` is correct
- Check server logs: `vercel logs <project-name>`

### Frontend Shows Error
- Clear browser cache
- Check browser console for errors
- Verify API URLs in `game.js` (should be `/api/...`)

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Vercel servers
- Add `0.0.0.0/0` (all IPs) to MongoDB Atlas IP Whitelist (less secure but works)

---

## 📝 Notes

- `vercel.json` routes `/api/*` to your Express server
- `.vercelignore` excludes unnecessary files from deployment
- Frontend uses relative paths automatically on production
- No code changes needed between local and production!
