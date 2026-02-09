const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== SOUND (Web Audio API + optional MP3s for game over / extra life) =====
let audioCtx = null;
let levelMusicOsc = null;
let levelMusicOscs = null;
let levelMusicGain = null;
let gameOverSoundBuffer = null;  // decoded MP3 for game over (optional)
let extraLifeSoundBuffer = null;  // decoded MP3 for lives up / extra life (optional)
let playerHitSoundBuffer = null;  // decoded MP3 when player loses a life (optional)
let powerUpSoundBuffer = null;   // decoded MP3 when player gets power-up (optional)
let introSoundBuffer = null;    // decoded MP3 for intro/logo (scoreboard screen)
const MAX_SOUNDS_PER_SECOND = 12;
let soundPlayTimes = [];
let soundMuted = false;

// ===== LANDING / PROFILES DOM =====
const landingScreen = document.getElementById("landingScreen");
const gameWrapper = document.getElementById("gameWrapper");
const loginBtn = document.getElementById("loginBtn");
const signUpBtn = document.getElementById("signUpBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");
const levelCards = document.querySelectorAll("[data-level-card]");
const startSelectedLevelBtn = document.getElementById("startSelectedLevelBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const overlaySettingsBtn = document.getElementById("overlaySettingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsNameInput = document.getElementById("settingsName");
const settingsMuteToggle = document.getElementById("settingsMuteToggle");
const settingsSaveBtn = document.getElementById("settingsSaveBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const signupPanel = document.getElementById("signupPanel");
const authPanelTitle = document.getElementById("authPanelTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const signupNameInput = document.getElementById("signupName");
const signupCancelBtn = document.getElementById("signupCancelBtn");
const signupStatus = document.getElementById("signupStatus");
const signupPasswordInput = document.getElementById("signupPassword");

// ===== API (optional backend; when set, signup/signin use password and scores sync to server) =====
const API_BASE = typeof window !== "undefined" && window.CYBER_STRIKE_API_URL ? window.CYBER_STRIKE_API_URL.replace(/\/$/, "") : "";
const AUTH_TOKEN_KEY = "cyberStrikeAuthTokenV1";

function getAuthToken() {
    try {
        return localStorage.getItem(AUTH_TOKEN_KEY) || "";
    } catch (_) {
        return "";
    }
}

function setAuthToken(token) {
    try {
        if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (_) {}
}

function useApi() {
    return !!API_BASE;
}

function isNetworkError(e) {
    const msg = (e && e.message) || "";
    return msg === "Failed to fetch" || e instanceof TypeError || e.name === "TypeError";
}

async function apiRequest(method, path, body, token) {
    const url = API_BASE + path;
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (token) opts.headers.Authorization = "Bearer " + token;
    if (body && method !== "GET") opts.body = JSON.stringify(body);
    let res;
    try {
        res = await fetch(url, opts);
    } catch (e) {
        if (isNetworkError(e)) {
            throw new Error("Cannot reach server. Start the API with: cd server && npm start");
        }
        throw e;
    }
    const data = res.ok ? (await res.json().catch(() => ({}))) : null;
    if (!res.ok) {
        const err = new Error(data && data.error ? data.error : "Request failed");
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

async function apiSignup(username, password) {
    return apiRequest("POST", "/api/auth/signup", { username: username.trim(), password }, null);
}

async function apiSignin(username, password) {
    return apiRequest("POST", "/api/auth/signin", { username: username.trim(), password }, null);
}

async function apiGetProfile() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        return await apiRequest("GET", "/api/profile", null, token);
    } catch (e) {
        if (e.status === 401) {
            setAuthToken("");
            currentProfileName = null;
            bestScoreForProfile = 0;
            highestUnlockedLevel = 1;
            updateLandingFromProfile();
        }
        return null;
    }
}

async function apiRecordScore(payload) {
    const token = getAuthToken();
    if (!token) return;
    try {
        const data = await apiRequest("POST", "/api/game/record", payload, token);
        if (data && typeof data.bestScore === "number") bestScoreForProfile = data.bestScore;
        if (data && typeof data.highestUnlockedLevel === "number") highestUnlockedLevel = data.highestUnlockedLevel;
    } catch (_) {}
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

function setProfileFromApiUser(user) {
    if (!user) return;
    currentProfileName = user.displayName || user.username || "";
    highestUnlockedLevel = Math.max(1, Math.min(user.highestUnlockedLevel || 1, MAX_LEVEL));
    bestScoreForProfile = user.bestScore || 0;
    updateLandingFromProfile();
}

// ===== PLAYER PROFILES / PROGRESS (localStorage, simple name-based login) =====
const PROFILE_STORAGE_KEY = "cyberStrikeProfilesV1";
let profiles = {};
let currentProfileName = null;
let highestUnlockedLevel = 1;
let bestScoreForProfile = 0;
let selectedLevelOnLanding = 1;
let pendingSignupName = null;

const RANDOM_NAME_PREFIXES = [
    "Neon",
    "Cyber",
    "Shadow",
    "Quantum",
    "Nova",
    "Pixel",
    "Turbo",
    "Void",
    "Laser",
    "Hyper"
];

const RANDOM_NAME_SUFFIXES = [
    "Blaze",
    "Rider",
    "Striker",
    "Phantom",
    "Viper",
    "Rift",
    "Falcon",
    "Specter",
    "Bolt",
    "Knight"
];

function generateRandomName() {
    const p = RANDOM_NAME_PREFIXES[Math.floor(Math.random() * RANDOM_NAME_PREFIXES.length)];
    const s = RANDOM_NAME_SUFFIXES[Math.floor(Math.random() * RANDOM_NAME_SUFFIXES.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100–999
    return p + s + num;
}

function loadProfiles() {
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) profiles = JSON.parse(raw) || {};
    } catch (_) {
        profiles = {};
    }
}

function saveProfiles() {
    try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
    } catch (_) {
        // ignore quota / privacy errors
    }
}

function applyLandingSelection() {
    levelCards.forEach(card => {
        const lvl = parseInt(card.dataset.level, 10);
        card.classList.toggle("selected", lvl === selectedLevelOnLanding);
    });
    if (landingScreen) {
        for (let i = 1; i <= MAX_LEVEL; i++) {
            landingScreen.classList.remove("landing-lvl-" + i);
        }
        landingScreen.classList.add("landing-lvl-" + selectedLevelOnLanding);
    }
    if (startSelectedLevelBtn) {
        startSelectedLevelBtn.disabled = !selectedLevelOnLanding;
        startSelectedLevelBtn.textContent = selectedLevelOnLanding
            ? `Start Level ${selectedLevelOnLanding}`
            : "Start Level";
    }
}

function isLevelCompleted(highest, level) {
    if (level < 5) return highest > level;
    return highest >= 5;
}

function applyLandingLocks() {
    levelCards.forEach(card => {
        const lvl = parseInt(card.dataset.level, 10);
        const lockEl = card.querySelector(".level-lock");
        if (lvl > highestUnlockedLevel) {
            card.classList.add("locked");
            card.classList.remove("completed");
            if (lockEl) lockEl.innerHTML = "Locked";
        } else {
            card.classList.remove("locked");
            if (isLevelCompleted(highestUnlockedLevel, lvl)) {
                card.classList.add("completed");
                if (lockEl) lockEl.innerHTML = "<span class=\"level-lock-icon\" aria-hidden=\"true\">\uD83C\uDFC6</span> Completed";
            } else {
                card.classList.remove("completed");
                if (lockEl) lockEl.innerHTML = "Unlocked";
            }
        }
    });
}

function updateLandingFromProfile() {
    applyLandingLocks();
    if (selectedLevelOnLanding > highestUnlockedLevel) {
        selectedLevelOnLanding = highestUnlockedLevel;
    }
    if (!selectedLevelOnLanding) selectedLevelOnLanding = 1;
    applyLandingSelection();

    const loggedIn = !!currentProfileName;
    if (loginBtn) loginBtn.classList.toggle("hidden", loggedIn);
    if (signUpBtn) signUpBtn.classList.toggle("hidden", loggedIn);
    if (logoutBtn) logoutBtn.classList.toggle("hidden", !loggedIn);

    if (loginStatus) {
        if (currentProfileName) {
            loginStatus.textContent = `Logged in as ${currentProfileName} · Best score: ${bestScoreForProfile}`;
        } else {
            loginStatus.textContent = "Not logged in — progress will only last for this browser.";
        }
    }
}

function setCurrentProfile(name) {
    if (!name) return;
    loadProfiles();
    if (!profiles[name]) {
        profiles[name] = { highestUnlockedLevel: 1, bestScore: 0 };
    }
    currentProfileName = name;
    const p = profiles[name];
    highestUnlockedLevel = Math.max(1, Math.min(p.highestUnlockedLevel || 1, MAX_LEVEL));
    bestScoreForProfile = p.bestScore || 0;
    saveProfiles();
    updateLandingFromProfile();
}

function initAudio() {
    if (audioCtx) {
        if (audioCtx.state === "suspended") audioCtx.resume();
        return;
    }
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        loadGameOverSound();
        loadExtraLifeSound();
        loadPlayerHitSound();
        loadPowerUpSound();
        loadIntroSound();
    } catch (e) {
        console.warn("Web Audio not supported", e);
    }
}

function loadGameOverSound() {
    if (!audioCtx || gameOverSoundBuffer) return;
    fetch("assets/gameover.mp3")
        .then(r => r.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => { gameOverSoundBuffer = decoded; })
        .catch(() => {});
}

function loadExtraLifeSound() {
    if (!audioCtx || extraLifeSoundBuffer) return;
    fetch("assets/extra-life.mp3")
        .then(r => r.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => { extraLifeSoundBuffer = decoded; })
        .catch(() => {});
}

function loadPlayerHitSound() {
    if (!audioCtx || playerHitSoundBuffer) return;
    fetch("assets/player-hit.mp3")
        .then(r => r.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => { playerHitSoundBuffer = decoded; })
        .catch(() => {});
}

function loadPowerUpSound() {
    if (!audioCtx || powerUpSoundBuffer) return;
    fetch("assets/powerup.mp3")
        .then(r => r.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => { powerUpSoundBuffer = decoded; })
        .catch(() => {});
}

function loadIntroSound() {
    if (!audioCtx || introSoundBuffer) return;
    fetch("assets/intro.mp3")
        .then(r => r.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => { introSoundBuffer = decoded; })
        .catch(() => {});
}

function playIntroSound() {
    if (soundMuted || !audioCtx || !introSoundBuffer) return;
    try {
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.7;
        src.buffer = introSoundBuffer;
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.onended = () => {
            try { src.disconnect(); gain.disconnect(); } catch (_) {}
        };
        src.start(0);
    } catch (e) {
        console.warn("Intro sound error", e);
    }
}

// ===== PROFILE PROGRESS HELPERS (called after game events) =====
function recordLevelClearProgress() {
    const nextLevel = Math.min(currentLevel + 1, MAX_LEVEL);
    if (currentLevel < MAX_LEVEL && nextLevel > highestUnlockedLevel) {
        highestUnlockedLevel = nextLevel;
    }
    if (!currentProfileName) return;
    loadProfiles();
    const name = currentProfileName;
    const existing = profiles[name] || { highestUnlockedLevel: 1, bestScore: 0 };
    if (currentLevel < MAX_LEVEL && nextLevel > (existing.highestUnlockedLevel || 1)) {
        existing.highestUnlockedLevel = nextLevel;
    }
    if (score > (existing.bestScore || 0)) {
        existing.bestScore = score;
    }
    profiles[name] = existing;
    highestUnlockedLevel = existing.highestUnlockedLevel;
    bestScoreForProfile = existing.bestScore;
    saveProfiles();
    if (useApi() && getAuthToken()) {
        var payload = { score: score, levelCleared: true, level: currentLevel };
        setTimeout(function () {
            apiRecordScore(payload).catch(function () {});
        }, 500);
    }
}

function recordGameOverProgress() {
    if (!currentProfileName) return;
    loadProfiles();
    const name = currentProfileName;
    const existing = profiles[name] || { highestUnlockedLevel: 1, bestScore: 0 };
    if (score > (existing.bestScore || 0)) {
        existing.bestScore = score;
        profiles[name] = existing;
        bestScoreForProfile = existing.bestScore;
        saveProfiles();
    }
    if (useApi() && getAuthToken()) {
        var payload = { score: score, levelCleared: false, level: currentLevel };
        setTimeout(function () {
            apiRecordScore(payload).catch(function () {});
        }, 500);
    }
}

function stopLevelMusic() {
    if (levelMusicOscs && Array.isArray(levelMusicOscs)) {
        levelMusicOscs.forEach(o => {
            try { o.stop(); o.disconnect(); } catch (_) {}
        });
        levelMusicOscs = null;
    }
    if (levelMusicOsc && audioCtx) {
        try {
            levelMusicOsc.stop();
            levelMusicOsc.disconnect();
        } catch (_) {}
        levelMusicOsc = null;
    }
    if (levelMusicGain && audioCtx) {
        try {
            levelMusicGain.disconnect();
        } catch (_) {}
        levelMusicGain = null;
    }
}

function playLevelMusic(level) {
    stopLevelMusic();
    if (soundMuted || !audioCtx) return;
    try {
        if (level === 5) {
            // Level 5: evolving ambient pad — detuned layers + soft triangle + slow “breathing” LFO
            const masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.06;
            masterGain.connect(audioCtx.destination);
            const oscs = [];
            // Slightly detuned sine layers (chorus-like) for a full, non-beep pad
            [
                { freq: 65, gain: 0.4 }, { freq: 65.4, gain: 0.25 },
                { freq: 98, gain: 0.28 }, { freq: 97.6, gain: 0.18 },
                { freq: 130, gain: 0.2 }, { freq: 130.3, gain: 0.12 },
                { freq: 196, gain: 0.1 }, { freq: 195.7, gain: 0.06 }
            ].forEach(({ freq, gain: g }) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                gain.gain.value = g;
                osc.type = "sine";
                osc.frequency.value = freq;
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(0);
                oscs.push(osc);
            });
            // Soft triangle layer for warmth and a bit of movement
            const triOsc = audioCtx.createOscillator();
            const triGain = audioCtx.createGain();
            triGain.gain.value = 0.08;
            triOsc.type = "triangle";
            triOsc.frequency.value = 49;
            triOsc.connect(triGain);
            triGain.connect(masterGain);
            triOsc.start(0);
            oscs.push(triOsc);
            // Slow “breathing” LFO so the pad evolves over time (not a static beep)
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 0.025;
            lfo.type = "sine";
            lfo.frequency.value = 0.04;
            lfo.connect(lfoGain);
            lfoGain.connect(masterGain.gain);
            lfo.start(0);
            oscs.push(lfo);
            levelMusicOscs = oscs;
            levelMusicGain = masterGain;
        } else {
            const freq = { 1: 110, 2: 146, 3: 196, 4: 246 }[level] || 110;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.06;
            osc.type = "sine";
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(0);
            levelMusicOsc = osc;
            levelMusicGain = gain;
        }
    } catch (e) {
        console.warn("Level music error", e);
    }
}

function toggleMute() {
    soundMuted = !soundMuted;
    if (soundMuted) stopLevelMusic();
    ["muteBtn", "muteBtnInGame"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle("muted", soundMuted);
        }
    });
    return soundMuted;
}

function playSound(type) {
    if (soundMuted || !audioCtx) return;
    const nowMs = Date.now();
    soundPlayTimes = soundPlayTimes.filter(t => nowMs - t < 1000);
    if (soundPlayTimes.length >= MAX_SOUNDS_PER_SECOND) return;
    soundPlayTimes.push(nowMs);
    try {
        // Use MP3 for game over when loaded
        if (type === "gameOver" && gameOverSoundBuffer) {
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.6;
            src.buffer = gameOverSoundBuffer;
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.onended = () => {
                try { src.disconnect(); gain.disconnect(); } catch (_) {}
            };
            src.start(0);
            return;
        }
        // Use MP3 for lives up / extra life when loaded
        if (type === "extraLife" && extraLifeSoundBuffer) {
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.6;
            src.buffer = extraLifeSoundBuffer;
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.onended = () => {
                try { src.disconnect(); gain.disconnect(); } catch (_) {}
            };
            src.start(0);
            return;
        }
        // Use MP3 when player loses a life (hit by enemy) when loaded
        if (type === "playerHit" && playerHitSoundBuffer) {
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.6;
            src.buffer = playerHitSoundBuffer;
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.onended = () => {
                try { src.disconnect(); gain.disconnect(); } catch (_) {}
            };
            src.start(0);
            return;
        }
        // Use MP3 when player gets power-up when loaded
        if (type === "powerUp" && powerUpSoundBuffer) {
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.6;
            src.buffer = powerUpSoundBuffer;
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.onended = () => {
                try { src.disconnect(); gain.disconnect(); } catch (_) {}
            };
            src.start(0);
            return;
        }
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.connect(audioCtx.destination);
        osc.connect(gain);
        osc.onended = () => {
            try { osc.disconnect(); gain.disconnect(); } catch (_) {}
        };
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        let stopTime = now + 0.2;
        if (type === "shoot") {
            // Single bullet: short laser peep
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
            osc.type = "square";
            stopTime = now + 0.08;
        } else if (type === "shootTriple") {
            // Multiple bullets: fuller burst
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(880, now + 0.03);
            osc.frequency.setValueAtTime(550, now + 0.06);
            osc.type = "square";
            gain.gain.setValueAtTime(0.12, now);
            stopTime = now + 0.12;
        } else if (type === "explosion") {
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.12, now);
            stopTime = now + 0.14;
        } else if (type === "powerUp") {
            // Power-up collect: bright pickup arpeggio
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.06);
            osc.frequency.setValueAtTime(784, now + 0.12);
            osc.type = "sine";
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            stopTime = now + 0.22;
        } else if (type === "extraLife") {
            // Extra life: uplifting rise (different from power-up)
            osc.frequency.setValueAtTime(392, now);
            osc.frequency.setValueAtTime(523, now + 0.07);
            osc.frequency.setValueAtTime(659, now + 0.14);
            osc.frequency.setValueAtTime(784, now + 0.21);
            osc.type = "sine";
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            stopTime = now + 0.32;
        } else if (type === "bossHit") {
            // Boss hit by bullet: heavy thud
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            stopTime = now + 0.12;
        } else if (type === "bossDeath") {
            // Boss finished: big impact then rumble down
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            stopTime = now + 0.4;
        } else if (type === "playerHit") {
            // Player hit by enemy: lost / damage type — descending sad tone
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
            osc.frequency.setValueAtTime(70, now + 0.25);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            stopTime = now + 0.35;
        } else if (type === "levelComplete") {
            // Victory jingle (after boss death)
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            osc.frequency.setValueAtTime(1047, now + 0.3);
            osc.type = "sine";
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            stopTime = now + 0.5;
        } else if (type === "gameOver") {
            // Game over: long descending lost tone
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            stopTime = now + 0.55;
        }
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime);
        osc.start(now);
        osc.stop(stopTime);
    } catch (e) {
        console.warn("Sound error", e);
    }
}

// ===== CONSTANTS =====
const CANVAS_W = 600;
const CANVAS_H = 400;
const BULLET_SIZE = 5;
const MAX_BULLETS = 48;
const BOSS_TIME = 30;
const FIRE_COOLDOWN_MS = 180;
const MOVE_PER_FRAME = 5;   // smooth movement per frame (60fps)
const SCORE_ENEMY = 10;
const SCORE_BOSS = 100;
const LIVES_START = 3;
const BOSS_MAX_HEALTH = 30;
const BOSS_BASE_SIZE = 80;                    // size at full health
const BOSS_MIN_SIZE = 16;                    // minimum size when almost dead
const BOSS_SPAWN_ENEMY_INTERVAL_FRAMES = 100; // boss spawns small enemy every ~1.7 sec (level 1)

// ===== LEVEL CONFIG =====
const LEVEL_CONFIG = {
    1: {
        bossTime: 30,
        bossHealth: 30,
        enemySpeed: 2,
        spawnIntervalFrames: 42,
        maxEnemies: 6,
        bossSpawnEnemyFrames: 100
    },
    2: {
        bossTime: 22,
        bossHealth: 50,
        enemySpeed: 2.5,
        spawnIntervalFrames: 30,
        maxEnemies: 8,
        bossSpawnEnemyFrames: 65
    },
    3: {
        bossTime: 18,
        bossHealth: 70,
        enemySpeed: 3,
        spawnIntervalFrames: 22,
        maxEnemies: 10,
        bossSpawnEnemyFrames: 50
    },
    4: {
        bossTime: 15,
        bossHealth: 90,
        enemySpeed: 3.4,
        spawnIntervalFrames: 16,
        maxEnemies: 12,
        bossSpawnEnemyFrames: 42
    },
    5: {
        bossTime: 12,
        bossHealth: 120,
        enemySpeed: 3.8,
        spawnIntervalFrames: 12,
        maxEnemies: 14,
        bossSpawnEnemyFrames: 36
    }
};
const MAX_LEVEL = 5;

// ===== LEVEL INTRO COPY (per-level description shown before start) =====
const LEVEL_INTRO_INFO = {
    1: {
        title: "Level 1 · Deep Space Patrol",
        desc: "Sweep the outer rim and destroy enemy drones before they reach the colony perimeter.",
        hint: "Stay mobile and grab power-ups early to thin out heavy waves."
    },
    2: {
        title: "Level 2 · Dusk Skies",
        desc: "Defend the city at sunset as enemy squadrons dive through the clouds.",
        hint: "Watch for diagonal attack patterns and don\u2019t get pinned at the edges."
    },
    3: {
        title: "Level 3 · Milky Way Rift",
        desc: "Navigate a dense field of debris while intercepting fast-moving fighters.",
        hint: "Use short bursts of movement between gaps instead of long, risky dashes."
    },
    4: {
        title: "Level 4 · Cyber Dimension",
        desc: "Enter the digital frontier and erase corrupted AIs swarming the data stream.",
        hint: "Focus fire on elite enemies that spawn extra bullets when destroyed."
    },
    5: {
        title: "Level 5 · The Void",
        desc: "Face the final onslaught in deep space where there is nowhere left to fall back.",
        hint: "Survival matters more than score \u2014 avoid damage and wait for safe openings."
    }
};

// ===== PLAYER =====
const player = {
    x: 280,
    y: 350,
    size: 20,
    speed: 10,
    powerUp: false,
    alive: true
};

// ===== BULLETS =====
let bullets = [];
let lastShotTime = 0;

// ===== ENEMIES =====
let enemies = [];
const MAX_ENEMIES = 5;
const ENEMY_SPEED_LEVEL_1 = 1;       // slower for level 1
const ENEMY_SPAWN_INTERVAL_FRAMES = 90;  // ~1.5 sec between spawns at 60fps
let lastEnemySpawnFrame = 0;
let gameFrame = 0;

// ===== POWER BOOSTERS =====
let boosters = [];

// ===== EXTRA LIFE PICKUPS (rare, +1 life when collected) =====
let lifePickups = [];

// ===== BOSS =====
let boss = {
    x: 220,
    y: 30,
    size: BOSS_BASE_SIZE,
    centerX: CANVAS_W / 2,
    centerY: 30 + BOSS_BASE_SIZE / 2,
    health: BOSS_MAX_HEALTH,
    alive: false
};
let bossSpawned = false;
let lastBossSpawnEnemyFrame = 0;

// ===== EXPLOSIONS =====
let explosions = [];

// ===== GAME STATE =====
let gameTime = 0;
let gamePaused = false;
let gameStarted = false;
let score = 0;
let lives = LIVES_START;
let currentLevel = 1;
let levelTheme = 1;  // 1 or 2 - used for drawing different characters per level
let levelIntroCountdownTimer = null;

// ===== HELD KEYS (smooth movement + constant fire) =====
const keysPressed = { left: false, right: false, up: false, down: false, fire: false };

// ===== DOM ELEMENTS =====
const startScreen = document.getElementById("startScreen");
const hud = document.getElementById("hud");
const scoreEl = document.getElementById("scoreValue");
const livesEl = document.getElementById("livesValue");
const levelEl = document.getElementById("levelValue");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayBtn = document.getElementById("overlayBtn");
const overlayBtn2 = document.getElementById("overlayBtn2");
const overlayHomeBtn = document.getElementById("overlayHomeBtn");
let overlayShownAt = 0;
let overlayHomeEnableListener = null;
var overlayBackToMenuBtn = null;
var overlayBackToMenuTimer = null;
const levelIntroScreen = document.getElementById("levelIntroScreen");
const levelIntroTitle = document.getElementById("levelIntroTitle");
const levelIntroDesc = document.getElementById("levelIntroDesc");
const levelIntroHint = document.getElementById("levelIntroHint");
const levelIntroCountdown = document.getElementById("levelIntroCountdown");
const levelIntroCountdownLabel = document.getElementById("levelIntroCountdownLabel");

function getLevelConfig() {
    return LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];
}

// ===== BACKGROUND (per level: scrolling starfield / sky / galaxy) =====
const BG_WRAP = CANVAS_H + 80;
let bgGradientCache = {}; // cache gradients per level to avoid creating every frame

function drawBackground() {
    const level = currentLevel;
    const t = gameFrame * 0.02;
    const scrollSlow = (gameFrame * 0.6) % BG_WRAP;
    const scrollMid = (gameFrame * 1.4) % BG_WRAP;
    const scrollFast = (gameFrame * 2.2) % BG_WRAP;

    function drawStar(x, y, r, rgba, twinkle) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgba},${twinkle})`;
        ctx.fill();
    }

    function wrapY(baseY, scroll) {
        return ((baseY + scroll) % BG_WRAP) - 40;
    }

    if (level === 1) {
        if (!bgGradientCache[1]) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            g.addColorStop(0, "#0a0a18");
            g.addColorStop(0.5, "#0d0d1a");
            g.addColorStop(1, "#050510");
            const g2 = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H * 0.3, 0, CANVAS_W / 2, CANVAS_H * 0.3, CANVAS_W);
            g2.addColorStop(0, "rgba(60,40,120,0.15)");
            g2.addColorStop(1, "transparent");
            bgGradientCache[1] = { g, g2 };
        }
        ctx.fillStyle = bgGradientCache[1].g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = bgGradientCache[1].g2;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        for (let i = 0; i < 70; i++) {
            const bx = ((i * 17.3 + 31) % (CANVAS_W + 20)) - 10;
            const baseY = ((i * 23.7 + 47) % BG_WRAP);
            const layer = i % 3;
            const scroll = layer === 0 ? scrollSlow : layer === 1 ? scrollMid : scrollFast;
            const y = wrapY(baseY, scroll);
            if (y < -5 || y > CANVAS_H + 5) continue;
            const r = (i % 3) * 0.5 + 0.5;
            const twinkle = 0.4 + 0.6 * Math.sin(t + i * 0.5) ** 2;
            drawStar(bx, y, r, "200,220,255", twinkle * 0.9);
        }
    } else if (level === 2) {
        if (!bgGradientCache[2]) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            g.addColorStop(0, "#1a0a20");
            g.addColorStop(0.35, "#2a1520");
            g.addColorStop(0.7, "#151030");
            g.addColorStop(1, "#080818");
            const g2 = ctx.createRadialGradient(CANVAS_W / 2, 0, 0, CANVAS_W / 2, 0, CANVAS_W * 0.8);
            g2.addColorStop(0, "rgba(180,80,60,0.2)");
            g2.addColorStop(0.5, "rgba(80,50,120,0.1)");
            g2.addColorStop(1, "transparent");
            bgGradientCache[2] = { g, g2 };
        }
        ctx.fillStyle = bgGradientCache[2].g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = bgGradientCache[2].g2;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        for (let i = 0; i < 60; i++) {
            const bx = ((i * 19.1 + 13) % (CANVAS_W + 20)) - 10;
            const baseY = ((i * 29.3 + 71) % BG_WRAP);
            const layer = i % 3;
            const scroll = layer === 0 ? scrollSlow : layer === 1 ? scrollMid : scrollFast;
            const y = wrapY(baseY, scroll);
            if (y < -5 || y > CANVAS_H + 5) continue;
            const r = (i % 2) * 0.4 + 0.6;
            const twinkle = 0.5 + 0.5 * Math.sin(t * 1.2 + i * 0.4) ** 2;
            drawStar(bx, y, r, "255,220,180", twinkle * 0.85);
        }
    } else if (level === 3) {
        if (!bgGradientCache[3]) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            g.addColorStop(0, "#080510");
            g.addColorStop(0.3, "#0a0612");
            g.addColorStop(0.7, "#0c0818");
            g.addColorStop(1, "#050208");
            const g2 = ctx.createRadialGradient(CANVAS_W * 0.3, CANVAS_H * 0.3, 0, CANVAS_W * 0.3, CANVAS_H * 0.3, CANVAS_W * 0.7);
            g2.addColorStop(0, "rgba(60,20,80,0.25)");
            g2.addColorStop(0.5, "rgba(40,15,60,0.1)");
            g2.addColorStop(1, "transparent");
            const g3 = ctx.createRadialGradient(CANVAS_W * 0.75, CANVAS_H * 0.65, 0, CANVAS_W * 0.75, CANVAS_H * 0.65, CANVAS_W * 0.5);
            g3.addColorStop(0, "rgba(80,25,100,0.2)");
            g3.addColorStop(1, "transparent");
            bgGradientCache[3] = { g, g2, g3 };
        }
        ctx.fillStyle = bgGradientCache[3].g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = bgGradientCache[3].g2;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = bgGradientCache[3].g3;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Milky Way band: one static diagonal strip (no scrolling = no repetition)
        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
        ctx.rotate(-0.35);
        ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
        const bandGrad = ctx.createLinearGradient(0, CANVAS_H / 2 - 100, 0, CANVAS_H / 2 + 100);
        bandGrad.addColorStop(0, "transparent");
        bandGrad.addColorStop(0.2, "rgba(180,160,255,0.08)");
        bandGrad.addColorStop(0.4, "rgba(220,200,255,0.18)");
        bandGrad.addColorStop(0.5, "rgba(255,240,255,0.22)");
        bandGrad.addColorStop(0.6, "rgba(220,200,255,0.18)");
        bandGrad.addColorStop(0.8, "rgba(180,160,255,0.08)");
        bandGrad.addColorStop(1, "transparent");
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-50, 0, CANVAS_W + 100, CANVAS_H + 100);
        ctx.restore();

        // Second band (static, subtle parallel arm)
        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
        ctx.rotate(-0.35);
        ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
        const band2 = ctx.createLinearGradient(0, CANVAS_H / 2 - 140, 0, CANVAS_H / 2 - 60);
        band2.addColorStop(0, "transparent");
        band2.addColorStop(0.5, "rgba(140,100,200,0.06)");
        band2.addColorStop(1, "transparent");
        ctx.fillStyle = band2;
        ctx.fillRect(-50, 0, CANVAS_W + 100, CANVAS_H + 100);
        ctx.restore();

        // Scrolling stars: longer wrap + phase offsets so layers don't sync (less obvious repeat)
        const wrapL3 = CANVAS_H * 3 + 400;
        const s0 = (gameFrame * 0.6) % wrapL3;
        const s1 = (gameFrame * 1.4 + 137) % wrapL3;
        const s2 = (gameFrame * 2.2 + 271) % wrapL3;
        for (let i = 0; i < 85; i++) {
            const bx = ((i * 17.3 + 41) % (CANVAS_W + 30)) - 15;
            const baseY = ((i * 31.7 + 59.3) % wrapL3);
            const layer = i % 3;
            const scroll = layer === 0 ? s0 : layer === 1 ? s1 : s2;
            const y = ((baseY + scroll) % wrapL3) - 80;
            if (y < -5 || y > CANVAS_H + 5) continue;
            const r = (i % 3) * 0.4 + 0.4;
            const twinkle = 0.4 + 0.6 * Math.sin(t + i * 0.7) ** 2;
            drawStar(bx, y, r, "255,200,255", twinkle * 0.9);
        }

        const bandCenterY = CANVAS_H / 2 + Math.sin(t * 0.5) * 12;
        for (let i = 0; i < 45; i++) {
            const bx = (i / 45) * (CANVAS_W + 60) - 30;
            const offset = Math.sin(bx * 0.03) * 30 + Math.sin(i * 0.5) * 18;
            const by = bandCenterY + offset;
            if (by < -5 || by > CANVAS_H + 5) continue;
            const r = (i % 2) * 0.3 + 0.35;
            const twinkle = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 0.3) ** 2;
            drawStar(bx, by, r, "255,245,255", twinkle * 0.95);
        }
    } else if (level === 4) {
        if (!bgGradientCache[4]) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            g.addColorStop(0, "#051008");
            g.addColorStop(0.5, "#081510");
            g.addColorStop(1, "#030a06");
            bgGradientCache[4] = { g };
        }
        ctx.fillStyle = bgGradientCache[4].g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        const gridScroll = (gameFrame * 1.2) % 40;
        ctx.strokeStyle = "rgba(0,255,120,0.12)";
        ctx.lineWidth = 1;
        for (let gy = -40; gy < CANVAS_H + 40; gy += 40) {
            const y = (gy + gridScroll) % (CANVAS_H + 80) - 40;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_W, y);
            ctx.stroke();
        }
        for (let gx = 0; gx < CANVAS_W + 40; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, CANVAS_H);
            ctx.stroke();
        }
        for (let i = 0; i < 60; i++) {
            const bx = ((i * 19.7 + 23) % (CANVAS_W + 20)) - 10;
            const baseY = ((i * 27.1 + 61) % BG_WRAP);
            const layer = i % 3;
            const scroll = layer === 0 ? scrollSlow : layer === 1 ? scrollMid : scrollFast;
            const y = wrapY(baseY, scroll);
            if (y < -5 || y > CANVAS_H + 5) continue;
            const r = (i % 2) * 0.4 + 0.5;
            const twinkle = 0.4 + 0.6 * Math.sin(t + i * 0.5) ** 2;
            drawStar(bx, y, r, "0,255,140", twinkle * 0.85);
        }
    } else {
        if (!bgGradientCache[5]) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            g.addColorStop(0, "#0a0805");
            g.addColorStop(0.3, "#050508");
            g.addColorStop(0.7, "#080508");
            g.addColorStop(1, "#030305");
            const g2 = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 0, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W);
            g2.addColorStop(0, "rgba(255,220,180,0.06)");
            g2.addColorStop(1, "transparent");
            bgGradientCache[5] = { g, g2 };
        }
        ctx.fillStyle = bgGradientCache[5].g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = bgGradientCache[5].g2;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        for (let i = 0; i < 50; i++) {
            const bx = ((i * 23.3 + 37) % (CANVAS_W + 30)) - 15;
            const baseY = ((i * 31.1 + 53) % BG_WRAP);
            const layer = i % 3;
            const scroll = layer === 0 ? scrollSlow : layer === 1 ? scrollMid : scrollFast;
            const y = wrapY(baseY, scroll);
            if (y < -5 || y > CANVAS_H + 5) continue;
            const r = (i % 2) * 0.5 + 0.6;
            const twinkle = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.4) ** 2;
            drawStar(bx, y, r, "255,240,200", twinkle * 0.9);
        }
    }
}

// ===== SPAWN ENEMY =====
function spawnEnemy() {
    const cfg = getLevelConfig();
    gameFrame++;
    const canSpawn = (gameFrame - lastEnemySpawnFrame) >= cfg.spawnIntervalFrames;
    if (enemies.length < cfg.maxEnemies && canSpawn) {
        lastEnemySpawnFrame = gameFrame;
        enemies.push({
            x: Math.random() * (CANVAS_W - 20),
            y: 0,
            size: 20,
            speed: cfg.enemySpeed,
            zigzag: Math.random() * 1.5 + 0.8,
            direction: Math.random() > 0.5 ? 1 : -1
        });
    }
}

// ===== SPAWN BOOSTER =====
function spawnBooster() {
    if (Math.random() < 0.005) {
        boosters.push({
            x: Math.random() * (CANVAS_W - 15),
            y: 0,
            size: 15,
            speed: 2
        });
    }
}

// ===== SPAWN EXTRA LIFE (very rare) =====
function spawnLifePickup() {
    if (gamePaused || !player.alive) return;
    if (Math.random() < 0.0008) {
        lifePickups.push({
            x: Math.random() * (CANVAS_W - 18),
            y: 0,
            size: 18,
            speed: 1.8
        });
    }
}

// ===== ANIMATED DRAW: PLAYER SHIP =====
function drawPlayer() {
    if (!player.alive) return;
    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    const s = player.size;
    const thrustFrame = Math.floor(gameFrame / 4) % 2;
    const thrustLen = thrustFrame ? 8 : 12;

    ctx.save();
    ctx.translate(cx, cy);

    if (currentLevel === 5) {
        // LEVEL 5: Elite interceptor — white/silver with cyan (hero, distinct from red enemies / purple boss / blue power-up)
        ctx.fillStyle = thrustFrame ? "#e8f0ff" : "#cce0ff";
        ctx.beginPath();
        ctx.moveTo(0, s * 0.55 + thrustLen);
        ctx.lineTo(-s * 0.5, s * 0.15);
        ctx.lineTo(-s * 0.38, -s * 0.35);
        ctx.lineTo(0, -s * 0.15);
        ctx.lineTo(s * 0.38, -s * 0.35);
        ctx.lineTo(s * 0.5, s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#6688cc";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#224466";
        ctx.beginPath();
        ctx.moveTo(-s * 0.22, -s * 0.1);
        ctx.lineTo(0, s * 0.25);
        ctx.lineTo(s * 0.22, -s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#4488ee";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.95)";
        ctx.beginPath();
        ctx.arc(0, s * 0.02, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = thrustFrame ? "#ffffff" : "#88ccff";
        ctx.fillRect(-s * 0.08, s * 0.38, s * 0.06, thrustLen);
        ctx.fillRect(0, s * 0.38, s * 0.06, thrustLen);
        ctx.fillRect(s * 0.08, s * 0.38, s * 0.06, thrustLen);
        if (player.powerUp) {
            ctx.strokeStyle = "rgba(100,200,255,0.95)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.78, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (currentLevel === 4) {
        // LEVEL 4: Double-engine wedge (cyan/teal) — distinct from orange enemies, purple power-up
        ctx.fillStyle = thrustFrame ? "#44ddff" : "#00ccff";
        ctx.fillRect(-s * 0.2, s * 0.35, s * 0.2, thrustLen);
        ctx.fillRect(s * 0.0, s * 0.35, s * 0.2, thrustLen);
        ctx.strokeStyle = "#0099cc";
        ctx.lineWidth = 1;
        ctx.strokeRect(-s * 0.2, s * 0.35, s * 0.2, thrustLen);
        ctx.strokeRect(s * 0.0, s * 0.35, s * 0.2, thrustLen);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.45);
        ctx.lineTo(-s * 0.5, s * 0.4);
        ctx.lineTo(-s * 0.35, s * 0.35);
        ctx.lineTo(0, s * 0.1);
        ctx.lineTo(s * 0.35, s * 0.35);
        ctx.lineTo(s * 0.5, s * 0.4);
        ctx.closePath();
        ctx.fillStyle = "#00bbee";
        ctx.fill();
        ctx.strokeStyle = "#0088aa";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -s * 0.1, s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = "#88eeff";
        ctx.fill();
        if (player.powerUp) {
            ctx.strokeStyle = "rgba(0,200,255,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (currentLevel === 3) {
        // LEVEL 3: Bat-wing / W-shape ship (magenta) — nothing like L1 triangle or L2 tank
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.4);
        ctx.lineTo(0, s * 0.5 + thrustLen);
        ctx.lineTo(s * 0.5, s * 0.4);
        ctx.closePath();
        ctx.fillStyle = thrustFrame ? "#ff66aa" : "#ff88cc";
        ctx.fill();
        ctx.strokeStyle = "#cc3388";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, -s * 0.1);
        ctx.lineTo(-s * 0.2, s * 0.35);
        ctx.lineTo(0, s * 0.05);
        ctx.lineTo(s * 0.2, s * 0.35);
        ctx.lineTo(s * 0.55, -s * 0.1);
        ctx.closePath();
        ctx.fillStyle = "#dd44aa";
        ctx.fill();
        ctx.strokeStyle = "#aa2288";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.18, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#ff99dd";
        ctx.fill();
        ctx.strokeStyle = "#ff66bb";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (player.powerUp) {
            ctx.strokeStyle = "rgba(255,100,200,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (currentLevel === 2) {
        // LEVEL 2: Wide tank-style ship (rectangle + dual thrust)
        ctx.fillStyle = thrustFrame ? "#ff5522" : "#ff9944";
        ctx.fillRect(-s * 0.45, s * 0.35, s * 0.25, thrustLen);
        ctx.fillRect(s * 0.2, s * 0.35, s * 0.25, thrustLen);
        ctx.strokeStyle = "#cc3300";
        ctx.lineWidth = 1;
        ctx.strokeRect(-s * 0.45, s * 0.35, s * 0.25, thrustLen);
        ctx.strokeRect(s * 0.2, s * 0.35, s * 0.25, thrustLen);
        ctx.fillStyle = "#dd4422";
        ctx.fillRect(-s * 0.5, -s * 0.2, s, s * 0.55);
        ctx.strokeStyle = "#aa2211";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-s * 0.5, -s * 0.2, s, s * 0.55);
        ctx.fillStyle = "#ff6644";
        ctx.fillRect(-s * 0.25, -s * 0.05, s * 0.5, s * 0.25);
        ctx.strokeStyle = "#ffaa88";
        ctx.lineWidth = 1;
        ctx.strokeRect(-s * 0.25, -s * 0.05, s * 0.5, s * 0.25);
        if (player.powerUp) {
            ctx.strokeStyle = "rgba(255,180,0,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else {
        // LEVEL 1: Scout (cyan/teal triangle)
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, s * 0.5);
        ctx.lineTo(0, s * 0.5 + thrustLen);
        ctx.lineTo(s * 0.4, s * 0.5);
        ctx.closePath();
        ctx.fillStyle = thrustFrame ? "#ff8844" : "#ffcc00";
        ctx.fill();
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.5);
        ctx.lineTo(-s * 0.5, s * 0.4);
        ctx.lineTo(-s * 0.2, s * 0.35);
        ctx.lineTo(s * 0.2, s * 0.35);
        ctx.lineTo(s * 0.5, s * 0.4);
        ctx.closePath();
        ctx.fillStyle = "#00ffcc";
        ctx.fill();
        ctx.strokeStyle = "#00ddbb";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "#88ffff";
        ctx.fill();
        if (player.powerUp) {
            ctx.strokeStyle = "rgba(0,255,136,0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// ===== ANIMATED DRAW: BULLETS (laser) =====
function drawBullets() {
    const flash = (Math.floor(gameFrame / 2) % 2) === 0;
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;
    bullets.forEach(b => {
        ctx.save();
        ctx.translate(b.x + BULLET_SIZE / 2, b.y + BULLET_SIZE / 2);
        if (isL5) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-BULLET_SIZE / 2, -6, BULLET_SIZE, 14);
            ctx.fillStyle = flash ? "#ccffff" : "#44aaff";
            ctx.globalAlpha = 0.95;
            ctx.fillRect(-BULLET_SIZE / 2, -4, BULLET_SIZE, 10);
            ctx.strokeStyle = "rgba(100,180,255,0.8)";
            ctx.lineWidth = 1;
            ctx.strokeRect(-BULLET_SIZE / 2 - 1, -7, BULLET_SIZE + 2, 16);
        } else if (isL4) {
            ctx.fillStyle = flash ? "#ffffff" : "#00ccff";
            ctx.fillRect(-BULLET_SIZE / 2, -5, BULLET_SIZE, 12);
            ctx.fillStyle = "#44ddee";
            ctx.globalAlpha = 0.9;
            ctx.fillRect(-BULLET_SIZE / 2, -3, BULLET_SIZE, 8);
        } else if (isL3) {
            ctx.fillStyle = flash ? "#ffffff" : "#ff44aa";
            ctx.fillRect(-BULLET_SIZE / 2, -5, BULLET_SIZE, 12);
            ctx.fillStyle = "#ff88cc";
            ctx.globalAlpha = 0.9;
            ctx.fillRect(-BULLET_SIZE / 2, -3, BULLET_SIZE, 8);
        } else if (isL2) {
            ctx.fillStyle = flash ? "#88ddff" : "#0088ff";
            ctx.fillRect(-BULLET_SIZE / 2, -5, BULLET_SIZE, 12);
            ctx.fillStyle = "#44aaff";
            ctx.globalAlpha = 0.85;
            ctx.fillRect(-BULLET_SIZE / 2, -3, BULLET_SIZE, 8);
        } else {
            ctx.fillStyle = flash ? "#ffffff" : "#ff3366";
            ctx.fillRect(-BULLET_SIZE / 2, -4, BULLET_SIZE, 10);
            ctx.fillStyle = "#ff6688";
            ctx.globalAlpha = 0.8;
            ctx.fillRect(-BULLET_SIZE / 2, -2, BULLET_SIZE, 6);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        b.y -= b.speed;
    });
    bullets = bullets.filter(b => b.y > 0);
}

// ===== ANIMATED DRAW: ENEMIES (small ships) =====
function drawEnemies() {
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;
    enemies.forEach(e => {
        const wobble = Math.sin(gameFrame * 0.2 + e.x * 0.1) * 2;
        const cx = e.x + e.size / 2;
        const cy = e.y + e.size / 2 + wobble;
        const s = e.size;
        const frame = Math.floor(gameFrame / 8) % 2;
        const wing = frame ? s * 0.35 : s * 0.4;

        ctx.save();
        ctx.translate(cx, cy);

        if (isL5) {
            // LEVEL 5: Void sentinel — 6-point blade, crimson (enemy, distinct from white player / purple boss / blue power-up)
            const spin = (gameFrame * 0.04 + e.x * 0.02) % (Math.PI * 2);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = spin + (i / 6) * Math.PI * 2;
                const outer = s * 0.48;
                const inner = s * 0.2;
                const x1 = Math.cos(a) * outer;
                const y1 = Math.sin(a) * outer;
                const x2 = Math.cos(a + Math.PI / 6) * inner;
                const y2 = Math.sin(a + Math.PI / 6) * inner;
                if (i === 0) ctx.moveTo(x1, y1);
                else ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.closePath();
            ctx.fillStyle = "#330808";
            ctx.fill();
            ctx.strokeStyle = "#ff4444";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = "#cc2222";
            ctx.fill();
            ctx.strokeStyle = "#ff6666";
            ctx.stroke();
        } else if (isL4) {
            // LEVEL 4: Chevron / manta drone (orange) — distinct from cyan player, purple power-up
            ctx.beginPath();
            ctx.moveTo(0, s * 0.45);
            ctx.lineTo(-s * 0.48, -s * 0.25);
            ctx.lineTo(-s * 0.25, -s * 0.1);
            ctx.lineTo(0, s * 0.2);
            ctx.lineTo(s * 0.25, -s * 0.1);
            ctx.lineTo(s * 0.48, -s * 0.25);
            ctx.closePath();
            ctx.fillStyle = "#ff9922";
            ctx.fill();
            ctx.strokeStyle = "#cc7700";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = "#ffbb44";
            ctx.fill();
        } else if (isL3) {
            // LEVEL 3: Square/box drone (magenta) — not triangle (L1) or circle (L2)
            ctx.fillStyle = "#aa3388";
            ctx.fillRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
            ctx.strokeStyle = "#882266";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
            ctx.fillStyle = "#dd66aa";
            ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4);
        } else if (isL2) {
            // LEVEL 2: Round drone (circle body + antenna)
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#3366cc";
            ctx.fill();
            ctx.strokeStyle = "#2244aa";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#4488ee";
            ctx.fillRect(-s * 0.08, -s * 0.5, s * 0.16, s * 0.35);
            ctx.beginPath();
            ctx.arc(0, -s * 0.5, s * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = "#66aaff";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = "#88bbff";
            ctx.fill();
        } else {
            // LEVEL 1: Small ship (yellow)
            ctx.beginPath();
            ctx.moveTo(0, s * 0.5);
            ctx.lineTo(-s * 0.35, -s * 0.35);
            ctx.lineTo(0, -s * 0.2);
            ctx.lineTo(s * 0.35, -s * 0.35);
            ctx.closePath();
            ctx.fillStyle = "#ffcc00";
            ctx.fill();
            ctx.strokeStyle = "#ddaa00";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-wing, 0);
            ctx.lineTo(-s * 0.5, s * 0.3);
            ctx.lineTo(-s * 0.2, s * 0.2);
            ctx.closePath();
            ctx.fillStyle = "#ffaa22";
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(wing, 0);
            ctx.lineTo(s * 0.5, s * 0.3);
            ctx.lineTo(s * 0.2, s * 0.2);
            ctx.closePath();
            ctx.fillStyle = "#ffaa22";
            ctx.fill();
        }

        ctx.restore();

        e.y += e.speed;
        e.x += e.zigzag * e.direction;
        if (e.x <= 0 || e.x >= CANVAS_W - e.size) e.direction *= -1;
    });
    enemies = enemies.filter(e => e.y < CANVAS_H);
}

// ===== ANIMATED DRAW: POWER-UPS (glow + shape + PLUS symbol) =====
function drawBoosters() {
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;
    boosters.forEach(b => {
        const cx = b.x + b.size / 2;
        const cy = b.y + b.size / 2;
        const angle = (gameFrame * 0.15) % (Math.PI * 2);
        const pulse = 0.88 + 0.18 * Math.sin(gameFrame * 0.25);
        const r = (b.size / 2) * pulse;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Outer glow (reads as "collect me") — same for all levels, color per level
        const glowR = r * 1.5;
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
        if (isL5) {
            glowGrad.addColorStop(0, "rgba(80,180,255,0.5)");
            glowGrad.addColorStop(0.5, "rgba(60,140,220,0.2)");
        } else if (isL4) {
            glowGrad.addColorStop(0, "rgba(150,80,255,0.5)");
            glowGrad.addColorStop(0.5, "rgba(120,60,220,0.2)");
        } else if (isL3) {
            glowGrad.addColorStop(0, "rgba(0,220,255,0.5)");
            glowGrad.addColorStop(0.5, "rgba(0,180,220,0.2)");
        } else if (isL2) {
            glowGrad.addColorStop(0, "rgba(255,180,60,0.5)");
            glowGrad.addColorStop(0.5, "rgba(255,140,40,0.2)");
        } else {
            glowGrad.addColorStop(0, "rgba(0,255,120,0.5)");
            glowGrad.addColorStop(0.5, "rgba(0,220,100,0.2)");
        }
        glowGrad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        if (isL5) {
            // LEVEL 5: Electric blue power-up (distinct from white player / red enemies / purple boss)
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = "#0a2844";
            ctx.fill();
            ctx.strokeStyle = "#44aaff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = "#2288dd";
            ctx.fill();
            ctx.strokeStyle = "#66bbff";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (isL4) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = "#9966ff";
            ctx.fill();
            ctx.strokeStyle = "#bb88ff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = "#bb88ff";
            ctx.fill();
        } else if (isL3) {
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r * 0.87, r * 0.5);
            ctx.lineTo(-r * 0.87, r * 0.5);
            ctx.closePath();
            ctx.fillStyle = "#00ddff";
            ctx.fill();
            ctx.strokeStyle = "#00aacc";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = "#88ffff";
            ctx.fill();
        } else if (isL2) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = "#ffaa22";
            ctx.fill();
            ctx.strokeStyle = "#cc8800";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = "#ffcc44";
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r * 0.7, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r * 0.7, 0);
            ctx.closePath();
            ctx.fillStyle = "#00ff88";
            ctx.fill();
            ctx.strokeStyle = "#00cc66";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Plus (+) symbol — different color per level
        const plusW = r * 0.5;
        const plusT = Math.max(2, r * 0.2);
        if (isL5) {
            ctx.fillStyle = "#aaddff";
            ctx.strokeStyle = "#2288cc";
        } else if (isL4) {
            ctx.fillStyle = "#ddbbff";
            ctx.strokeStyle = "#7744cc";
        } else if (isL3) {
            ctx.fillStyle = "#aaffff";
            ctx.strokeStyle = "#00aacc";
        } else if (isL2) {
            ctx.fillStyle = "#ffdd88";
            ctx.strokeStyle = "#cc8800";
        } else {
            ctx.fillStyle = "#88ffaa";
            ctx.strokeStyle = "#00aa66";
        }
        ctx.fillRect(-plusT / 2, -plusW / 2, plusT, plusW);
        ctx.fillRect(-plusW / 2, -plusT / 2, plusW, plusT);
        ctx.lineWidth = 1;
        ctx.strokeRect(-plusT / 2, -plusW / 2, plusT, plusW);
        ctx.strokeRect(-plusW / 2, -plusT / 2, plusW, plusT);

        ctx.restore();

        b.y += b.speed;
    });
    boosters = boosters.filter(b => b.y < CANVAS_H);
}

// ===== ANIMATED DRAW: EXTRA LIFE PICKUPS (heart, level-colored) =====
function drawLifePickups() {
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;
    lifePickups.forEach(lp => {
        const cx = lp.x + lp.size / 2;
        const cy = lp.y + lp.size / 2;
        const r = lp.size / 2;
        const pulse = 0.92 + 0.12 * Math.sin(gameFrame * 0.2);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        // Outer glow (life = precious)
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        if (isL5) {
            glowGrad.addColorStop(0, "rgba(255,120,140,0.4)");
            glowGrad.addColorStop(0.6, "rgba(255,80,100,0.15)");
        } else if (isL4) {
            glowGrad.addColorStop(0, "rgba(255,100,120,0.4)");
            glowGrad.addColorStop(0.6, "rgba(220,80,100,0.15)");
        } else if (isL3) {
            glowGrad.addColorStop(0, "rgba(255,100,150,0.4)");
            glowGrad.addColorStop(0.6, "rgba(220,80,130,0.15)");
        } else if (isL2) {
            glowGrad.addColorStop(0, "rgba(255,100,80,0.4)");
            glowGrad.addColorStop(0.6, "rgba(220,80,60,0.15)");
        } else {
            glowGrad.addColorStop(0, "rgba(255,100,120,0.4)");
            glowGrad.addColorStop(0.6, "rgba(220,80,100,0.15)");
        }
        glowGrad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Heart shape (two circles + triangle)
        const heartScale = r * 0.9;
        ctx.fillStyle = isL5 ? "#ff6688" : isL4 ? "#ff5577" : isL3 ? "#ff4488" : isL2 ? "#ff6644" : "#ff4466";
        ctx.strokeStyle = isL5 ? "#cc3355" : isL4 ? "#cc2244" : isL3 ? "#cc3366" : isL2 ? "#cc4422" : "#cc2244";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, heartScale * 0.35);
        ctx.bezierCurveTo(heartScale * 0.5, -heartScale * 0.2, heartScale * 0.9, heartScale * 0.3, 0, heartScale * 0.95);
        ctx.bezierCurveTo(-heartScale * 0.9, heartScale * 0.3, -heartScale * 0.5, -heartScale * 0.2, 0, heartScale * 0.35);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();

        ctx.restore();

        lp.y += lp.speed;
    });
    lifePickups = lifePickups.filter(lp => lp.y < CANVAS_H);
}

// ===== BOSS: size shrinks as health decreases (stays centered) =====
function updateBossSize() {
    if (!boss.alive) return;
    const maxH = boss.maxHealth ?? BOSS_MAX_HEALTH;
    const t = boss.health / maxH;
    boss.size = Math.max(BOSS_MIN_SIZE, t * BOSS_BASE_SIZE);
    boss.x = boss.centerX - boss.size / 2;
    boss.y = boss.centerY - boss.size / 2;
}

// ===== BOSS spawns small enemies =====
function spawnEnemyFromBoss() {
    const cfg = getLevelConfig();
    if (!boss.alive || enemies.length >= cfg.maxEnemies + 2) return;
    if (gameFrame - lastBossSpawnEnemyFrame < cfg.bossSpawnEnemyFrames) return;
    lastBossSpawnEnemyFrame = gameFrame;
    const pad = 10;
    const spawnW = Math.max(20, boss.size - 20);
    enemies.push({
        x: boss.x + pad + Math.random() * (spawnW - 20),
        y: boss.y + boss.size,
        size: 20,
        speed: cfg.enemySpeed,
        zigzag: Math.random() * 1.5 + 0.8,
        direction: Math.random() > 0.5 ? 1 : -1
    });
}

// ===== ANIMATED DRAW: BOSS (large ship, pulse) =====
function drawBoss() {
    if (!boss.alive) return;
    updateBossSize();
    const cx = boss.x + boss.size / 2;
    const cy = boss.y + boss.size / 2;
    const s = boss.size;
    const pulse = 1 + 0.05 * Math.sin(gameFrame * 0.12);
    const wingFrame = Math.floor(gameFrame / 6) % 2;
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);

    if (isL5) {
        // LEVEL 5: Void Titan — dark purple core, gold spikes (boss, distinct from white player / red enemies / blue power-up)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.2);
        gradient.addColorStop(0, "rgba(120,60,180,0.6)");
        gradient.addColorStop(0.3, "rgba(80,40,140,0.35)");
        gradient.addColorStop(0.6, "rgba(50,25,90,0.15)");
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        const armRot = (gameFrame * 0.015) % (Math.PI * 2);
        for (let i = 0; i < 8; i++) {
            const a = armRot + (i / 8) * Math.PI * 2;
            const tipX = cx + Math.cos(a) * (s * 0.7);
            const tipY = cy + Math.sin(a) * (s * 0.7);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(tipX, tipY);
            ctx.strokeStyle = "#cc9922";
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(tipX, tipY, s * 0.14, 0, Math.PI * 2);
            ctx.fillStyle = "#ffdd88";
            ctx.fill();
            ctx.strokeStyle = "#ffcc44";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.35);
        coreGrad.addColorStop(0, "#aa88dd");
        coreGrad.addColorStop(0.5, "#6644aa");
        coreGrad.addColorStop(1, "#332266");
        ctx.fillStyle = coreGrad;
        ctx.fill();
        ctx.strokeStyle = "#8866cc";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = "#ccbbee";
        ctx.fill();
        ctx.strokeStyle = "#9988cc";
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (isL4) {
        // LEVEL 4: Octagon boss (indigo/dark blue) — distinct from cyan player, orange enemies, purple power-up
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
        gradient.addColorStop(0, "rgba(80,60,180,0.5)");
        gradient.addColorStop(0.6, "rgba(60,40,140,0.15)");
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * (s * 0.5);
            const y = cy + Math.sin(a) * (s * 0.5);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "#5544aa";
        ctx.fill();
        ctx.strokeStyle = "#443388";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "#8877dd";
        ctx.fill();
        ctx.strokeStyle = "#6655bb";
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (isL3) {
        // LEVEL 3: Cross/plus boss (magenta) — not hex (L1), not diamond (L2)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
        gradient.addColorStop(0, "rgba(255,80,180,0.5)");
        gradient.addColorStop(0.6, "rgba(200,50,150,0.15)");
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        const arm = s * 0.45;
        const thick = s * 0.2;
        ctx.fillStyle = "#cc3399";
        ctx.fillRect(cx - thick / 2, cy - arm, thick, arm * 2);
        ctx.fillRect(cx - arm, cy - thick / 2, arm * 2, thick);
        ctx.strokeStyle = "#992288";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - thick / 2, cy - arm, thick, arm * 2);
        ctx.strokeRect(cx - arm, cy - thick / 2, arm * 2, thick);
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "#ff66bb";
        ctx.fill();
        ctx.strokeStyle = "#ffaadd";
        ctx.lineWidth = 1;
        ctx.stroke();
        const wing = wingFrame ? s * 0.26 : s * 0.32;
        ctx.fillStyle = "#882266";
        ctx.fillRect(cx - s * 0.5, cy - thick / 2, -wing, thick);
        ctx.fillRect(cx + s * 0.5, cy - thick / 2, wing, thick);
    } else if (isL2) {
        // LEVEL 2: Diamond boss (rotating diamond hull, red/amber)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
        gradient.addColorStop(0, "rgba(255,80,40,0.5)");
        gradient.addColorStop(0.6, "rgba(255,60,20,0.15)");
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        const rot = (gameFrame * 0.02) % (Math.PI * 2);
        const r = s * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
        ctx.lineTo(cx + Math.cos(rot + Math.PI / 2) * r, cy + Math.sin(rot + Math.PI / 2) * r);
        ctx.lineTo(cx + Math.cos(rot + Math.PI) * r, cy + Math.sin(rot + Math.PI) * r);
        ctx.lineTo(cx + Math.cos(rot + Math.PI * 1.5) * r, cy + Math.sin(rot + Math.PI * 1.5) * r);
        ctx.closePath();
        ctx.fillStyle = "#bb3322";
        ctx.fill();
        ctx.strokeStyle = "#992211";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#ff5533";
        ctx.fill();
        ctx.strokeStyle = "#ffcc88";
        ctx.lineWidth = 1;
        ctx.stroke();
        const wing = wingFrame ? s * 0.3 : s * 0.36;
        ctx.fillStyle = "#882211";
        ctx.fillRect(cx - s * 0.55, cy - s * 0.1, -wing, 12);
        ctx.fillRect(cx + s * 0.55, cy - s * 0.1, wing, 12);
    } else {
        // LEVEL 1: Hexagon boss (purple)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
        gradient.addColorStop(0, "rgba(170,68,255,0.4)");
        gradient.addColorStop(0.6, "rgba(170,68,255,0.1)");
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        const r = s * 0.45;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "#aa44ff";
        ctx.fill();
        ctx.strokeStyle = "#8844cc";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#cc66ff";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        const wing = wingFrame ? s * 0.35 : s * 0.4;
        ctx.fillStyle = "#8844aa";
        ctx.fillRect(cx - s * 0.5, cy - s * 0.15, -wing, 8);
        ctx.fillRect(cx + s * 0.5, cy - s * 0.15, wing, 8);
    }

    ctx.restore();

    // Health bar (above boss)
    const barY = boss.y - 8;
    const barW = boss.size;
    const barH = 6;
    const isL2Bar = currentLevel === 2;
    const isL3Bar = currentLevel === 3;
    const isL4Bar = currentLevel === 4;
    const isL5Bar = currentLevel === 5;
    ctx.fillStyle = isL5Bar ? "#1a0a2a" : isL4Bar ? "#1a0a2a" : isL3Bar ? "#221122" : isL2Bar ? "#331100" : "#330022";
    ctx.fillRect(boss.x, barY, barW, barH);
    ctx.fillStyle = isL5Bar ? "#8866cc" : isL4Bar ? "#6655bb" : isL3Bar ? "#ff44aa" : isL2Bar ? "#ff6633" : "#ff3366";
    const maxH = boss.maxHealth ?? BOSS_MAX_HEALTH;
    const fillW = (barW * boss.health) / maxH;
    ctx.fillRect(boss.x, barY, fillW, barH);
    ctx.strokeStyle = isL5Bar ? "#6644aa" : isL4Bar ? "#5544aa" : isL3Bar ? "#aa3388" : isL2Bar ? "#cc4422" : "#aa44ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(boss.x, barY, barW, barH);
}

// ===== CREATE EXPLOSION =====
const MAX_EXPLOSIONS = 16;
let lastExplosionSound = 0;
let lastBossHitSound = 0;
function createExplosion(x, y) {
    if (explosions.length >= MAX_EXPLOSIONS) return;
    explosions.push({ x, y, radius: 5, alpha: 1 });
    const now = Date.now();
    if (now - lastExplosionSound > 120) {
        lastExplosionSound = now;
        playSound("explosion");
    }
}

// ===== ANIMATED DRAW: EXPLOSIONS =====
function drawExplosions() {
    const isL2 = currentLevel === 2;
    const isL3 = currentLevel === 3;
    const isL4 = currentLevel === 4;
    const isL5 = currentLevel === 5;
    explosions.forEach(exp => {
        const ring = exp.radius * 0.6;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        if (isL5) {
            ctx.fillStyle = `rgba(180,220,255,${exp.alpha * 0.5})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(100,180,255,${exp.alpha})`;
        } else if (isL4) {
            ctx.fillStyle = `rgba(0,200,255,${exp.alpha * 0.4})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(0,180,220,${exp.alpha})`;
        } else if (isL3) {
            ctx.fillStyle = `rgba(255,100,200,${exp.alpha * 0.4})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(220,80,180,${exp.alpha})`;
        } else if (isL2) {
            ctx.fillStyle = `rgba(100,180,255,${exp.alpha * 0.4})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(80,160,255,${exp.alpha})`;
        } else {
            ctx.fillStyle = `rgba(255,165,0,${exp.alpha * 0.4})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255,200,100,${exp.alpha})`;
        }
        ctx.lineWidth = isL5 ? 2.5 : 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, ring, 0, Math.PI * 2);
        ctx.fillStyle = isL5 ? `rgba(100,180,255,${exp.alpha})` : isL3 ? `rgba(200,50,150,${exp.alpha})` : isL2 ? `rgba(50,120,200,${exp.alpha})` : `rgba(255,100,50,${exp.alpha})`;
        ctx.fill();
        exp.radius += 2;
        exp.alpha -= 0.05;
    });
    explosions = explosions.filter(e => e.alpha > 0);
}

// ===== COLLISION =====
function isColliding(a, b, sizeA = BULLET_SIZE) {
    return (
        a.x < b.x + b.size &&
        a.x + sizeA > b.x &&
        a.y < b.y + b.size &&
        a.y + sizeA > b.y
    );
}

// ===== CHECK COLLISIONS (fixed: no splice in loop) =====
function checkCollisions() {
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();

    // Bullet vs enemies
    bullets.forEach((bullet, bi) => {
        enemies.forEach((enemy, ei) => {
            if (isColliding(bullet, enemy)) {
                createExplosion(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
                bulletsToRemove.add(bi);
                enemiesToRemove.add(ei);
                score += SCORE_ENEMY;
            }
        });
    });

    bullets = bullets.filter((_, i) => !bulletsToRemove.has(i));
    enemies = enemies.filter((_, i) => !enemiesToRemove.has(i));

    // Bullet vs boss
    const bossBulletsToRemove = new Set();
    bullets.forEach((bullet, bi) => {
        if (boss.alive && isColliding(bullet, boss)) {
            bossBulletsToRemove.add(bi);
            boss.health--;
            createExplosion(bullet.x, bullet.y);
            if (boss.health <= 0) {
                boss.alive = false;
                score += SCORE_BOSS;
                stopLevelMusic();
                playSound("bossDeath");
                setTimeout(() => {
                    playSound("levelComplete");
                    try {
                        if (currentLevel < MAX_LEVEL) {
                            const nextLev = currentLevel + 1;
                            recordLevelClearProgress();
                            showOverlay("LEVEL " + nextLev + " — PLAY NEXT", "levelComplete", "nextLevel", "Next Level or Play Again from start");
                        } else {
                            recordLevelClearProgress();
                            showOverlay("YOU WIN!", "levelComplete", "restart");
                        }
                    } catch (_) {}
                }, 380);
            } else {
                const t = Date.now();
                if (t - lastBossHitSound > 100) {
                    lastBossHitSound = t;
                    playSound("bossHit");
                }
            }
        }
    });
    bullets = bullets.filter((_, i) => !bossBulletsToRemove.has(i));

    // Player vs enemies (only one life lost per frame)
    const enemiesHitPlayer = new Set();
    let playerHitThisFrame = false;
    enemies.forEach((enemy, ei) => {
        if (isColliding(player, enemy, player.size)) {
            enemiesHitPlayer.add(ei);
                if (!playerHitThisFrame) {
                playerHitThisFrame = true;
                playSound("playerHit");
                if (player.powerUp) {
                    player.powerUp = false;
                } else {
                    lives--;
                    updateHUD();
                    if (lives <= 0) {
                        player.alive = false;
                        stopLevelMusic();
                        playSound("gameOver");
                        try { showOverlay("GAME OVER", "gameOver"); } catch (_) {}
                    } else {
                        player.alive = false;
                        setTimeout(respawnPlayer, 800);
                    }
                }
            }
        }
    });
    enemies = enemies.filter((_, i) => !enemiesHitPlayer.has(i));

    // Player vs boosters
    boosters = boosters.filter(booster => {
        if (isColliding(player, booster, player.size)) {
            player.powerUp = true;
            playSound("powerUp");
            return false;
        }
        return true;
    });

    // Player vs extra life pickups
    lifePickups = lifePickups.filter(lp => {
        if (isColliding(player, lp, player.size)) {
            lives++;
            updateHUD();
            playSound("extraLife");
            return false;
        }
        return true;
    });
}

function respawnPlayer() {
    player.alive = true;
    player.x = CANVAS_W / 2 - player.size / 2;
    player.y = CANVAS_H - player.size - 10;
    player.powerUp = false;
}

// ===== MOVE PLAYER (with bounds) — also used by UI buttons =====
function move(direction) {
    if (!player.alive || !gameStarted) return;
    const step = player.speed;
    if (direction === "left") player.x = Math.max(0, player.x - step);
    if (direction === "right") player.x = Math.min(CANVAS_W - player.size, player.x + step);
    if (direction === "up") player.y = Math.max(0, player.y - step);
    if (direction === "down") player.y = Math.min(CANVAS_H - player.size, player.y + step);
}

// ===== APPLY HELD KEYS (smooth movement each frame) =====
function applyMovement() {
    if (!player.alive || !gameStarted || gamePaused) return;
    const step = MOVE_PER_FRAME;
    if (keysPressed.left) player.x = Math.max(0, player.x - step);
    if (keysPressed.right) player.x = Math.min(CANVAS_W - player.size, player.x + step);
    if (keysPressed.up) player.y = Math.max(0, player.y - step);
    if (keysPressed.down) player.y = Math.min(CANVAS_H - player.size, player.y + step);
}

// ===== SHOOT (with fire rate cooldown) =====
let lastShootSoundTime = 0;
const SHOOT_SOUND_INTERVAL_MS = 120;
function shoot() {
    if (!player.alive || !gameStarted) return;
    if (bullets.length >= MAX_BULLETS) return;
    const now = Date.now();
    if (now - lastShotTime < FIRE_COOLDOWN_MS) return;
    lastShotTime = now;
    if (now - lastShootSoundTime >= SHOOT_SOUND_INTERVAL_MS) {
        lastShootSoundTime = now;
        if (player.powerUp) playSound("shootTriple");
        else playSound("shoot");
    }
    if (player.powerUp) {
        bullets.push(
            { x: player.x, y: player.y, speed: 7 },
            { x: player.x + 10, y: player.y, speed: 7 },
            { x: player.x + 20, y: player.y, speed: 7 }
        );
    } else {
        bullets.push({
            x: player.x + player.size / 2 - BULLET_SIZE / 2,
            y: player.y,
            speed: 7
        });
    }
}

// ===== KEYBOARD CONTROLS (held keys for smooth movement + constant fire) =====
function keyToDirection(key) {
    if (key === "ArrowLeft" || key === "a") return "left";
    if (key === "ArrowRight" || key === "d") return "right";
    if (key === "ArrowUp" || key === "w") return "up";
    if (key === "ArrowDown" || key === "s") return "down";
    return null;
}

document.addEventListener("keydown", e => {
    // Don't steal keys when typing in inputs/textareas/contentEditable
    const t = e.target;
    const isTypingTarget = t && (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
    );
    if (isTypingTarget) return;

    // When overlay is visible, block all key default actions (prevents form submit / reload) and only allow primary button
    if (overlay && overlay.classList.contains("visible") && overlayBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === " " || e.key === "Enter") overlayBtn.click();
        return;
    }

    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s"];
    if (keys.includes(e.key)) e.preventDefault();

    if (!gameStarted) {
        if (e.key === " ") startGame();
        return;
    }

    const dir = keyToDirection(e.key);
    if (dir) keysPressed[dir] = true;
    if (e.key === " ") keysPressed.fire = true;
});

document.addEventListener("keyup", e => {
    const t = e.target;
    const isTypingTarget = t && (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
    );
    if (isTypingTarget) return;

    const dir = keyToDirection(e.key);
    if (dir) keysPressed[dir] = false;
    if (e.key === " ") keysPressed.fire = false;
});

// Block reload shortcut (F5, Ctrl+R, Cmd+R) when overlay is visible so "Reload site?" does not appear
document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("visible")) return;
    if (e.key === "F5" || (e.key === "r" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        e.stopPropagation();
    }
}, true);

// Prevent ANY form submit on the page (stops accidental reload)
document.addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

// When overlay is visible, block link clicks only if the link is outside the overlay (allow overlay toolbar links)
document.addEventListener("click", function (e) {
    if (!overlay || !overlay.classList.contains("visible")) return;
    var node = e.target;
    while (node && node !== document.body) {
        if (node.nodeName === "A" && node.getAttribute("href")) {
            if (!overlay.contains(node)) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
        node = node.parentNode;
    }
}, true);

// Swallow unhandled promise rejections while overlay is visible (e.g. API errors) so they never cause reload/error page
window.addEventListener("unhandledrejection", function (e) {
    if (overlay && overlay.classList.contains("visible")) e.preventDefault();
});

window.addEventListener("blur", () => {
    keysPressed.left = false;
    keysPressed.right = false;
    keysPressed.up = false;
    keysPressed.down = false;
    keysPressed.fire = false;
});

// ===== START / RESTART =====
function doStartGame() {
    gameStarted = true;
    gamePaused = false;
    startScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.classList.add("active");
    gameTime = 0;
    score = 0;
    lives = LIVES_START;
    if (window.startAtLevel) {
        currentLevel = Math.max(1, Math.min(window.startAtLevel, MAX_LEVEL));
        levelTheme = currentLevel;
        window.startAtLevel = null;
    } else {
        currentLevel = 1;
        levelTheme = 1;
    }
    playLevelMusic(currentLevel);
    resetGameState();
    updateHUD();
}

function startGame() {
    if (gameStarted) return;
    initAudio();
    // Scoreboard / intro: play cinematic logo sound then start (wait for load + play duration)
    function tryIntroThenStart() {
        if (!introSoundBuffer) return false;
        playIntroSound();
        const durationMs = Math.min(introSoundBuffer.duration * 1000, 5000);
        setTimeout(doStartGame, durationMs);
        return true;
    }
    if (tryIntroThenStart()) return;
    const deadline = Date.now() + 4000;
    const id = setInterval(() => {
        if (tryIntroThenStart() || Date.now() > deadline) {
            clearInterval(id);
            if (!gameStarted) doStartGame();
        }
    }, 50);
}

function showLevelIntro(lvl) {
    if (!levelIntroScreen) return;
    const info = LEVEL_INTRO_INFO[lvl] || LEVEL_INTRO_INFO[1];
    if (levelIntroTitle) levelIntroTitle.textContent = info.title;
    if (levelIntroDesc) levelIntroDesc.textContent = info.desc;
    if (levelIntroHint) {
        const name = currentProfileName || "";
        if (name) {
            levelIntroHint.textContent = `Pilot ${name}, ${info.hint}`;
        } else {
            levelIntroHint.textContent = info.hint;
        }
    }
    if (levelIntroCountdown) levelIntroCountdown.textContent = "3";
    if (levelIntroCountdownLabel) levelIntroCountdownLabel.textContent = "Launching in...";
    levelIntroScreen.classList.remove("hidden");
}

function hideLevelIntro() {
    if (!levelIntroScreen) return;
    levelIntroScreen.classList.add("hidden");
}

// Start directly at a specific level (for testing)
function doStartGameAtLevel(lvl) {
    gameStarted = true;
    gamePaused = false;
    startScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.classList.add("active");
    gameTime = 0;
    score = 0;
    lives = LIVES_START;
    currentLevel = lvl;
    levelTheme = lvl;
    playLevelMusic(currentLevel);
    resetGameState();
    updateHUD();
}

const LEVEL_INTRO_COUNTDOWN_SEC = 3;

function startLevelWithIntro(level) {
    if (gameStarted) return;
    const lvl = Math.max(1, Math.min(level, MAX_LEVEL));

    showLevelIntro(lvl);
    initAudio();
    if (introSoundBuffer) playIntroSound();

    let remaining = LEVEL_INTRO_COUNTDOWN_SEC;
    if (levelIntroCountdown) levelIntroCountdown.textContent = String(remaining);
    if (levelIntroCountdownTimer) clearInterval(levelIntroCountdownTimer);

    levelIntroCountdownTimer = setInterval(() => {
        remaining--;
        if (levelIntroCountdown) {
            if (remaining > 0) {
                levelIntroCountdown.textContent = String(remaining);
            } else {
                levelIntroCountdown.textContent = "GO!";
                if (levelIntroCountdownLabel) levelIntroCountdownLabel.textContent = "";
            }
        }
        if (remaining <= 0) {
            clearInterval(levelIntroCountdownTimer);
            levelIntroCountdownTimer = null;
            hideLevelIntro();
            doStartGameAtLevel(lvl);
        }
    }, 1000);
}

// Start directly at a specific level (for testing)
function startGameAtLevel(level) {
    if (gameStarted) return;
    const lvl = Math.max(1, Math.min(level, MAX_LEVEL));
    initAudio();
    function tryIntroThenStart() {
        if (!introSoundBuffer) return false;
        playIntroSound();
        const durationMs = Math.min(introSoundBuffer.duration * 1000, 5000);
        setTimeout(() => doStartGameAtLevel(lvl), durationMs);
        return true;
    }
    if (tryIntroThenStart()) return;
    const deadline = Date.now() + 4000;
    const id = setInterval(() => {
        if (tryIntroThenStart() || Date.now() > deadline) {
            clearInterval(id);
            if (!gameStarted) doStartGameAtLevel(lvl);
        }
    }, 50);
}

function resetGameState() {
    const cfg = getLevelConfig();
    player.x = CANVAS_W / 2 - player.size / 2;
    player.y = CANVAS_H - player.size - 10;
    player.alive = true;
    player.powerUp = false;
    bullets = [];
    enemies = [];
    boosters = [];
    lifePickups = [];
    explosions = [];
    boss.alive = false;
    boss.health = cfg.bossHealth;
    boss.maxHealth = cfg.bossHealth;
    boss.size = BOSS_BASE_SIZE;
    boss.x = CANVAS_W / 2 - BOSS_BASE_SIZE / 2;
    boss.y = 30;
    boss.centerX = CANVAS_W / 2;
    boss.centerY = 30 + BOSS_BASE_SIZE / 2;
    bossSpawned = false;
    lastBossSpawnEnemyFrame = 0;
    lastShotTime = 0;
    gameFrame = 0;
    lastEnemySpawnFrame = 0;
}

let lastHUD = { score: -1, lives: -1, level: -1 };
function updateHUD() {
    if (score === lastHUD.score && lives === lastHUD.lives && currentLevel === lastHUD.level) return;
    lastHUD.score = score;
    lastHUD.lives = lives;
    lastHUD.level = currentLevel;
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = lives;
    if (levelEl) levelEl.textContent = currentLevel;
}

// ===== OVERLAY =====
function showOverlay(text, type = "gameOver", action = "restart", subtitle = "") {
    try {
        gamePaused = true;
        overlayShownAt = Date.now();
        overlay.className = "overlay visible " + type;
        if (type === "gameOver") {
            try { recordGameOverProgress(); } catch (_) {}
        }
        const scoreHtml = `<span class="overlay-score">Score: ${score}</span>`;
        const subHtml = subtitle ? `<span class="overlay-subtitle">${subtitle}</span>` : "";
        if (overlayText) overlayText.innerHTML = `<span class="overlay-title">${text}</span>${subHtml}${scoreHtml}`;
        if (overlayHomeBtn) overlayHomeBtn.style.display = "none";
        if (overlayBackToMenuTimer) clearTimeout(overlayBackToMenuTimer);
        if (overlayBackToMenuBtn && overlayBackToMenuBtn.parentNode) overlayBackToMenuBtn.parentNode.removeChild(overlayBackToMenuBtn);
        overlayBackToMenuBtn = null;
        overlayBackToMenuTimer = setTimeout(function () {
            overlayBackToMenuTimer = null;
            if (!overlay || !overlay.classList.contains("visible")) return;
            var container = overlayHomeBtn && overlayHomeBtn.parentNode;
            if (!container) return;
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-home btn-back-to-menu";
            btn.setAttribute("aria-label", "Back to main menu");
            btn.innerHTML = '<svg class="btn-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!overlay || !overlay.classList.contains("visible")) return;
                if (!e.isTrusted) return;
                backToMenuButtonClicked = true;
                allowGoToLanding = true;
                goToLanding();
            });
            container.appendChild(btn);
            overlayBackToMenuBtn = btn;
        }, 3000);
        if (overlayBtn) {
            if (action === "nextLevel") {
                overlayBtn.textContent = "NEXT LEVEL";
                overlayBtn.onclick = startNextLevel;
                overlayBtn.classList.remove("hidden");
                if (overlayBtn2) {
                    overlayBtn2.textContent = "PLAY AGAIN";
                    overlayBtn2.onclick = restartGame;
                    overlayBtn2.classList.remove("hidden");
                }
            } else {
                overlayBtn.textContent = "PLAY AGAIN";
                overlayBtn.onclick = restartGame;
                overlayBtn.classList.remove("hidden");
                if (overlayBtn2) overlayBtn2.classList.add("hidden");
            }
            if (canvas) canvas.tabIndex = -1;
            overlayBtn.focus();
            setTimeout(function () {
                if (overlayBtn && overlay.classList.contains("visible")) overlayBtn.focus();
            }, 150);
        }
    } catch (_) {}
}

function hideOverlay() {
    overlay.className = "overlay";
    if (overlayBtn2) overlayBtn2.classList.add("hidden");
    if (overlayBackToMenuTimer) clearTimeout(overlayBackToMenuTimer);
    overlayBackToMenuTimer = null;
    if (overlayBackToMenuBtn && overlayBackToMenuBtn.parentNode) overlayBackToMenuBtn.parentNode.removeChild(overlayBackToMenuBtn);
    overlayBackToMenuBtn = null;
    if (overlayHomeBtn) overlayHomeBtn.style.display = "";
    if (canvas) canvas.tabIndex = 0;
    removeOverlayHomeEnableListener();
}

function removeOverlayHomeEnableListener() {
    if (!overlayHomeEnableListener) return;
    overlay.removeEventListener("mousemove", overlayHomeEnableListener);
    overlay.removeEventListener("touchstart", overlayHomeEnableListener);
    overlay.removeEventListener("click", overlayHomeEnableListener);
    overlayHomeEnableListener = null;
}

function enableHomeButtonAfterUserInteraction() {
    removeOverlayHomeEnableListener();
    overlayHomeEnableListener = function (e) {
        if (!overlay.classList.contains("visible")) return;
        if (Date.now() - overlayShownAt < 2000) return;
        if (e && e.target && (e.target === overlayHomeBtn || overlayHomeBtn.contains(e.target))) return;
        removeOverlayHomeEnableListener();
        if (!overlayHomeBtn) return;
        overlayHomeBtn.classList.remove("overlay-home-disabled");
        overlayHomeEnabledAt = Date.now();
        overlayHomeBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (!overlay || !overlay.classList.contains("visible")) return;
            if (Date.now() - overlayHomeEnabledAt < 400) return;
            if (lastOverlayDismissedAt && Date.now() - lastOverlayDismissedAt < 400) return;
            if (!e.isTrusted) return;
            overlayHomeBtn.onclick = null;
            allowGoToLanding = true;
            goToLanding();
        };
    };
    overlay.addEventListener("mousemove", overlayHomeEnableListener, { once: false });
    overlay.addEventListener("touchstart", overlayHomeEnableListener, { once: false });
    overlay.addEventListener("click", overlayHomeEnableListener, { once: false });
}

var lastOverlayDismissedAt = 0;  // guard: ignore Home if Play Again/Next Level was just clicked
var overlayHomeEnabledAt = 0;   // when Home was enabled; ignore its clicks for 400ms (avoids same-gesture synthetic click)

function startNextLevel() {
    lastOverlayDismissedAt = Date.now();
    currentLevel++;
    levelTheme = currentLevel;
    hideOverlay();
    gamePaused = false;
    const cfg = getLevelConfig();
    bullets = [];
    enemies = [];
    explosions = [];
    boss.alive = false;
    boss.health = cfg.bossHealth;
    boss.maxHealth = cfg.bossHealth;
    boss.size = BOSS_BASE_SIZE;
    boss.x = CANVAS_W / 2 - BOSS_BASE_SIZE / 2;
    boss.y = 30;
    boss.centerX = CANVAS_W / 2;
    boss.centerY = 30 + BOSS_BASE_SIZE / 2;
    bossSpawned = false;
    lastBossSpawnEnemyFrame = 0;
    gameTime = 0;
    lastEnemySpawnFrame = gameFrame;
    playLevelMusic(currentLevel);
    updateHUD();
}

function restartGame() {
    lastOverlayDismissedAt = Date.now();
    hideOverlay();
    gamePaused = false;
    stopLevelMusic();
    gameTime = 0;
    score = 0;
    lives = LIVES_START;
    // Keep currentLevel so "Play Again" restarts the same level
    levelTheme = currentLevel;
    resetGameState();
    playLevelMusic(currentLevel);
    updateHUD();
}

// ===== RETURN TO LANDING (Home) =====
var allowGoToLanding = false;
var backToMenuButtonClicked = false;  // only our "Back to menu" button sets this; blocks any other path

function goToLanding() {
    if (!allowGoToLanding) return;
    if (!backToMenuButtonClicked) return;
    if (overlay && overlay.classList.contains("visible") && Date.now() - overlayShownAt < 2500) return;
    if (lastOverlayDismissedAt && Date.now() - lastOverlayDismissedAt < 400) return;
    allowGoToLanding = false;
    backToMenuButtonClicked = false;
    // Stop game and music
    stopLevelMusic();
    gameStarted = false;
    gamePaused = false;

    // Clear transient state
    bullets = [];
    enemies = [];
    boosters = [];
    lifePickups = [];
    explosions = [];
    boss.alive = false;
    bossSpawned = false;

    // Reset overlay and keys
    if (overlay) hideOverlay();
    keysPressed.left = keysPressed.right = keysPressed.up = keysPressed.down = keysPressed.fire = false;

    // Show landing, hide game wrapper
    if (landingScreen) landingScreen.classList.remove("hidden");
    if (gameWrapper) gameWrapper.classList.add("hidden");

    // Refresh landing UI (levels + best score text) based on latest progress
    updateLandingFromProfile();
}

// ===== GAME LOOP =====
let gameTimeInterval = null;
function startGameTimer() {
    if (gameTimeInterval) clearInterval(gameTimeInterval);
    gameTimeInterval = setInterval(() => {
        if (gameStarted && !gamePaused) gameTime++;
    }, 1000);
}

function gameLoop() {
    if (!gameStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    try {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    drawBackground();

    // Keep theme in sync with level (so Level 2 always uses Level 2 characters)
    levelTheme = currentLevel;

    applyMovement();
    if (keysPressed.fire) shoot();

    spawnEnemy();
    spawnBooster();
    spawnLifePickup();

    const cfg = getLevelConfig();
    if (gameTime >= cfg.bossTime && !bossSpawned) {
        boss.alive = true;
        bossSpawned = true;
        boss.health = cfg.bossHealth;
        boss.maxHealth = cfg.bossHealth;
        boss.centerX = CANVAS_W / 2;
        boss.centerY = 30 + BOSS_BASE_SIZE / 2;
        lastBossSpawnEnemyFrame = gameFrame;
    }

    spawnEnemyFromBoss();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBoosters();
    drawLifePickups();
    drawBoss();
    drawExplosions();
    checkCollisions();

    // Show level badge on screen (Level 2 or 3)
    if (currentLevel === 2) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, sans-serif";
        ctx.fillStyle = "rgba(255,150,50,0.9)";
        ctx.strokeStyle = "#ff6633";
        ctx.lineWidth = 1;
        ctx.textAlign = "left";
        ctx.strokeText("LEVEL 2", 8, CANVAS_H - 8);
        ctx.fillText("LEVEL 2", 8, CANVAS_H - 8);
        ctx.restore();
    } else if (currentLevel === 3) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, sans-serif";
        ctx.fillStyle = "rgba(255,100,200,0.9)";
        ctx.strokeStyle = "#aa3388";
        ctx.lineWidth = 1;
        ctx.textAlign = "left";
        ctx.strokeText("LEVEL 3", 8, CANVAS_H - 8);
        ctx.fillText("LEVEL 3", 8, CANVAS_H - 8);
        ctx.restore();
    } else if (currentLevel === 4) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, sans-serif";
        ctx.fillStyle = "rgba(0,200,255,0.9)";
        ctx.strokeStyle = "#0099cc";
        ctx.lineWidth = 1;
        ctx.textAlign = "left";
        ctx.strokeText("LEVEL 4", 8, CANVAS_H - 8);
        ctx.fillText("LEVEL 4", 8, CANVAS_H - 8);
        ctx.restore();
    } else if (currentLevel === 5) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, sans-serif";
        ctx.fillStyle = "rgba(100,200,255,0.9)";
        ctx.strokeStyle = "#4488cc";
        ctx.lineWidth = 1;
        ctx.textAlign = "left";
        ctx.strokeText("LEVEL 5", 8, CANVAS_H - 8);
        ctx.fillText("LEVEL 5", 8, CANVAS_H - 8);
        ctx.restore();
    }

    updateHUD();
    } catch (_) {}
    requestAnimationFrame(gameLoop);
}

// Optional: start at a specific level via URL (?level=3)
(function () {
    const params = new URLSearchParams(window.location.search);
    const l = parseInt(params.get("level"), 10);
    if (!isNaN(l) && l >= 1 && l <= MAX_LEVEL) window.startAtLevel = l;
})();

startGameTimer();
gameLoop();

// ===== LANDING / LOGIN EVENTS =====
loadProfiles();
if (useApi() && getAuthToken()) {
    apiGetProfile().then(function(user) {
        if (user) setProfileFromApiUser(user);
        updateLandingFromProfile();
    }).catch(function() {
        updateLandingFromProfile();
    });
} else {
    updateLandingFromProfile();
}

// Auth popup mode: "login" | "signup"
let authPanelMode = "login";

function openAuthPopup(mode) {
    authPanelMode = mode;
    if (authPanelTitle) authPanelTitle.textContent = mode === "login" ? "Login" : "Sign Up";
    if (authSubmitBtn) authSubmitBtn.textContent = mode === "login" ? "Login" : "Sign Up";
    if (signupStatus) signupStatus.textContent = "";
    if (signupNameInput) {
        signupNameInput.value = mode === "signup" && !useApi() ? generateRandomName() : "";
        signupNameInput.focus();
    }
    if (signupPasswordInput) signupPasswordInput.value = "";
    if (signupPanel) signupPanel.classList.remove("hidden");
}

if (loginBtn) {
    loginBtn.addEventListener("click", () => openAuthPopup("login"));
}

if (signUpBtn) {
    signUpBtn.addEventListener("click", () => openAuthPopup("signup"));
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        if (useApi()) setAuthToken("");
        currentProfileName = null;
        highestUnlockedLevel = 1;
        bestScoreForProfile = 0;
        selectedLevelOnLanding = 1;
        updateLandingFromProfile();
    });
}

levelCards.forEach(card => {
    card.addEventListener("click", () => {
        const lvl = parseInt(card.dataset.level, 10);
        if (lvl > highestUnlockedLevel) return;
        selectedLevelOnLanding = lvl;
        applyLandingSelection();
    });
});

if (startSelectedLevelBtn) {
    startSelectedLevelBtn.addEventListener("click", () => {
        if (!selectedLevelOnLanding) return;
        if (landingScreen) landingScreen.classList.add("hidden");
        if (gameWrapper) gameWrapper.classList.remove("hidden");
        if (startScreen) startScreen.classList.add("hidden");
        if (hud) hud.classList.add("hidden");
        startLevelWithIntro(selectedLevelOnLanding);
    });
}

function openSettingsPanel() {
    if (settingsPanel) settingsPanel.classList.remove("hidden");
    if (settingsNameInput) {
        settingsNameInput.value = currentProfileName || "";
        settingsNameInput.focus();
    }
    if (settingsMuteToggle) settingsMuteToggle.textContent = soundMuted ? "Unmute" : "Mute";
}

if (openSettingsBtn && settingsPanel) {
    openSettingsBtn.addEventListener("click", openSettingsPanel);
}
if (overlaySettingsBtn && settingsPanel) {
    overlaySettingsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openSettingsPanel();
    });
}

if (closeSettingsBtn && settingsPanel) {
    closeSettingsBtn.addEventListener("click", () => {
        settingsPanel.classList.add("hidden");
    });
}

if (settingsPanel) {
    settingsPanel.addEventListener("click", (e) => {
        if (e.target === settingsPanel) settingsPanel.classList.add("hidden");
    });
}

if (settingsMuteToggle) {
    settingsMuteToggle.addEventListener("click", () => {
        const mutedNow = toggleMute();
        settingsMuteToggle.textContent = mutedNow ? "Unmute" : "Mute";
    });
}

if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener("click", () => {
        if (!settingsNameInput) {
            if (settingsPanel) settingsPanel.classList.add("hidden");
            return;
        }
        const name = settingsNameInput.value.trim();
        if (name) setCurrentProfile(name);
        if (settingsPanel) settingsPanel.classList.add("hidden");
    });
}

if (authSubmitBtn && signupNameInput) {
    authSubmitBtn.addEventListener("click", async () => {
        const name = signupNameInput.value.trim();
        const password = signupPasswordInput ? signupPasswordInput.value : "";
        if (!name) {
            if (signupStatus) signupStatus.textContent = authPanelMode === "login" ? "Please enter your name." : "Please enter a name to sign up.";
            return;
        }
        if (authPanelMode === "login") {
            if (useApi()) {
                if (!password) {
                    if (signupStatus) signupStatus.textContent = "Password required.";
                    return;
                }
                if (signupStatus) signupStatus.textContent = "Signing in...";
                try {
                    const data = await apiSignin(name, password);
                    setAuthToken(data.token);
                    setProfileFromApiUser(data.user);
                    if (signupPasswordInput) signupPasswordInput.value = "";
                    if (signupPanel) signupPanel.classList.add("hidden");
                    if (signupStatus) signupStatus.textContent = "";
                } catch (e) {
                    if (signupStatus) signupStatus.textContent = e.message || "Login failed.";
                }
                return;
            }
            loadProfiles();
            if (profiles[name]) {
                setCurrentProfile(name);
                if (signupPanel) signupPanel.classList.add("hidden");
                if (signupStatus) signupStatus.textContent = "";
            } else {
                if (signupStatus) signupStatus.textContent = "No profile found. Try Sign Up to create one.";
            }
            return;
        }
        if (useApi()) {
            if (!password) {
                if (signupStatus) signupStatus.textContent = "Password required (min 4 characters).";
                return;
            }
            if (password.length < 4) {
                if (signupStatus) signupStatus.textContent = "Password must be at least 4 characters.";
                return;
            }
            if (signupStatus) signupStatus.textContent = "Creating account...";
            try {
                const data = await apiSignup(name, password);
                setAuthToken(data.token);
                setProfileFromApiUser(data.user);
                if (signupPasswordInput) signupPasswordInput.value = "";
                pendingSignupName = null;
                if (signupPanel) signupPanel.classList.add("hidden");
                if (signupStatus) signupStatus.textContent = "";
            } catch (e) {
                if (signupStatus) signupStatus.textContent = e.message || "Sign up failed.";
            }
            return;
        }
        loadProfiles();
        if (profiles[name]) {
            if (signupStatus) signupStatus.textContent = "That name is already taken. Choose another.";
            return;
        }
        if (signupStatus) signupStatus.textContent = "";
        setCurrentProfile(name);
        pendingSignupName = null;
        if (signupPanel) signupPanel.classList.add("hidden");
    });
}

if (signupCancelBtn && signupPanel) {
    signupCancelBtn.addEventListener("click", () => {
        pendingSignupName = null;
        if (signupStatus) signupStatus.textContent = "";
        signupPanel.classList.add("hidden");
    });
}

if (signupPanel) {
    signupPanel.addEventListener("click", (e) => {
        if (e.target === signupPanel) {
            pendingSignupName = null;
            if (signupStatus) signupStatus.textContent = "";
            signupPanel.classList.add("hidden");
        }
    });
}

// Home button: no permanent listener; handler is attached only when button is enabled (in enableHomeButtonAfterUserInteraction)

// Focus trap: keep focus on primary overlay button so Home can never be focused by keyboard
if (overlay && overlayBtn) {
    overlay.addEventListener("focusout", function (e) {
        if (!overlay.classList.contains("visible")) return;
        var next = e.relatedTarget;
        if (next && overlay.contains(next)) return;
        setTimeout(function () {
            if (overlay.classList.contains("visible")) overlayBtn.focus();
        }, 0);
    });
}

// Block any click on Home for 3s (capture phase so it runs before the button’s handler)
if (overlay && overlayHomeBtn) {
    overlay.addEventListener("click", function (e) {
        if (!overlay.classList.contains("visible")) return;
        if (overlayHomeBtn.classList.contains("overlay-home-disabled") && (e.target === overlayHomeBtn || overlayHomeBtn.contains(e.target))) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

// When overlay is visible, only the overlay may receive clicks (stops clicks passing through to canvas/controls)
if (gameWrapper && overlay) {
    gameWrapper.addEventListener("click", function (e) {
        if (!overlay.classList.contains("visible")) return;
        if (!overlay.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

// Document-level: block all clicks and keydown when overlay is visible except on overlay (catches body/html/anywhere)
document.addEventListener("click", function (e) {
    if (!overlay || !overlay.classList.contains("visible")) return;
    if (!overlay.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}, true);
document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("visible")) return;
    if (document.activeElement && overlay.contains(document.activeElement)) return;
    e.preventDefault();
    e.stopPropagation();
}, true);
