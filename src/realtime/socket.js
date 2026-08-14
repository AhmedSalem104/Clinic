const { Server } = require('socket.io');
const { env } = require('../config/env');
const { logger } = require('../config/logger');

let io;

const attachRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.appOrigin, credentials: true },
    transports: ['websocket', 'polling']
  });
  io.on('connection', (socket) => {
    socket.join('clinic');
    socket.on('join:doctor', (doctorId) => {
      if (doctorId) socket.join(`doctor:${doctorId}`);
    });
    socket.on('disconnect', () => logger.debug({ socketId: socket.id }, 'Realtime client disconnected'));
  });
  return io;
};

const emitClinicEvent = (event, payload, doctorId) => {
  if (!io) return;
  if (doctorId) io.to(`doctor:${doctorId}`).emit(event, payload);
  io.to('clinic').emit(event, payload);
};

module.exports = { attachRealtime, emitClinicEvent };
