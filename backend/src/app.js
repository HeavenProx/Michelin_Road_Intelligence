/**
 * app.js — Point d'entrée du serveur Express
 * Lance le serveur HTTP, configure les middlewares globaux (CORS, JSON, sessions)
 * et branche les routes auth + api.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────────────
// Autorise les appels depuis le frontend React (localhost:3000)
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true, // nécessaire pour envoyer les cookies de session
}));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Sessions en mémoire ───────────────────────────────────────────────────
// Pas de base de données : les tokens Strava sont stockés en mémoire RAM.
// Un redémarrage du serveur efface toutes les sessions — acceptable en dev.
app.use(session({
  secret: process.env.SESSION_SECRET || 'michelin-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // mettre true en production (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);  // /auth/strava, /auth/callback, /auth/logout
app.use('/api', apiRoutes);    // /api/profile, /api/recommend, /api/tyre-score, /api/demo

// ─── Route de santé ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Michelin Road Intelligence API opérationnelle',
    timestamp: new Date().toISOString(),
  });
});

// ─── Gestionnaire d'erreurs global ─────────────────────────────────────────
// Attrape toutes les erreurs non gérées et retourne une réponse propre
app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Une erreur interne est survenue',
  });
});

// ─── Démarrage ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚴 Michelin Road Intelligence — Backend démarré`);
  console.log(`   → http://localhost:${PORT}/health`);
  console.log(`   → http://localhost:${PORT}/auth/strava`);
  console.log(`   → http://localhost:${PORT}/api/demo\n`);
});

module.exports = app;
