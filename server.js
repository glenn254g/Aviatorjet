const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('./app/db');
const Engine = require('./app/engine');
const attachSocket = require('./app/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 5000;

const store = {
  users: new Map(),
  txns: new Map(),
  bets: new Map()
};

app.set('store', store);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'app/public')));

// API routes
app.use('/api/auth', require('./app/auth'));
app.use('/api/user', require('./app/user'));
app.use('/api/admin', require('./app/admin'));

// Root route FIXED
app.get('/', (req, res) => {
  res.send('Betfity Aviator Server Running Successfully');
});

// Game state route
app.get('/api/state', (req, res) => {
  res.json({
    ok: true,
    data: engine.getState()
  });
});

// Game routes
['/game', '/crash', '/play'].forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'app/public/game.html'));
  });
});

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/public/admin.html'));
});

const engine = new Engine(io, store);

attachSocket(io, engine);

// Start server after DB connection
connectDB()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Betfity Aviator running on port ${PORT}`);
      engine.start();
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  });
