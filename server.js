'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path    = require('path');

const config       = require('./src/config');
const camera       = require('./src/camera');
const identity     = require('./src/identity');
const mdns         = require('./src/mdns');
const { csrfToken, csrfVerify } = require('./src/middleware/csrf');
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

// CSRF protection for all form POSTs
app.use(csrfToken);
app.use(csrfVerify);

// Expose CSRF token to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

app.use('/', authRoutes);
app.use('/', indexRoutes);
app.use('/settings', settingsRoutes);

// Generic error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Error — pi-ip', message: 'Internal server error.' });
});

async function start() {
  const id = identity.ensure();
  mdns.apply(id);
  await camera.start();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`pi-ip web UI  →  http://0.0.0.0:${config.port}`);
    console.log(`RTSP stream   →  rtsp://[PI_IP]:${config.rtspPort}/live`);
    console.log(`WebRTC        →  http://[PI_IP]:${config.webrtcPort}/live`);
  });

  // Graceful shutdown — kill MediaMTX before exiting
  async function shutdown(signal) {
    console.log(`\n[pi-ip] ${signal} received, shutting down…`);
    server.close();
    await camera.stop();
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start pi-ip:', err.message);
  process.exit(1);
});
