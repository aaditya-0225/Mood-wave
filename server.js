const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the visualizer and mobile app from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Listen for biometric data from the mobile controller
  socket.on('biometrics', (data) => {
    socket.broadcast.emit('biometrics', data);
  });

  socket.on('modeChange', (data) => {
    socket.broadcast.emit('modeChange', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Mood Wave Server running on http://localhost:${PORT}`);
  console.log(`- Visualizer: http://localhost:${PORT}/`);
  console.log(`- Mobile Controller: http://localhost:${PORT}/mobile/`);
});
