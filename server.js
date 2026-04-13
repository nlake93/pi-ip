'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path    = require('path');

const config       = require('./src/config');
const camera       = require('./src/camera');
const authRoutes   = require('./src/routes/auth');
const indexRoutes  = require('./src/routes/index');
const settingsRoutes = require('./src/routes/settings');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret:            config.sessionSecret,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

app.use('/', authRoutes);
app.use('/', indexRoutes);
app.use('/settings', settingsRoutes);

// Generic error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Error — pi-ip', message: 'Internal server error.' });
});

async function start() {
  await camera.start();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`pi-ip web UI  →  http://0.0.0.0:${config.port}`);
    console.log(`RTSP stream   →  rtsp://[PI_IP]:${config.rtspPort}/cam`);
    console.log(`WebRTC        →  http://[PI_IP]:${config.webrtcPort}/cam`);
  });
}

start().catch((err) => {
  console.error('Failed to start pi-ip:', err.message);
  process.exit(1);
});
