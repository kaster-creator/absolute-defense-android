const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });
const rooms = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function roomInfo(code) {
  const room = rooms.get(code);
  return {
    type: 'room',
    code,
    players: room ? room.size : 0,
    maxPlayers: 4
  };
}

function broadcast(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const player of room) {
    send(player, roomInfo(code));
  }
}

function leave(ws) {
  const code = ws.roomCode;
  if (!code) return;

  const room = rooms.get(code);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(code);
    else broadcast(code);
  }
  ws.roomCode = null;
}

server.on('connection', ws => {
  send(ws, { type: 'welcome', message: 'ABSOLUTE DEFENSE ONLINE' });

  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: 'error', message: 'Неверный формат' });
    }

    if (msg.type === 'create') {
      leave(ws);
      let code;
      do {
        code = crypto.randomInt(100000, 1000000).toString();
      } while (rooms.has(code));

      rooms.set(code, new Set([ws]));
      ws.roomCode = code;
      send(ws, { type: 'created', code });
      broadcast(code);
    }

    if (msg.type === 'join') {
      const code = String(msg.code || '');
      const room = rooms.get(code);

      if (!room) {
        return send(ws, { type: 'error', message: 'Комната не найдена' });
      }
      if (room.size >= 4 && !room.has(ws)) {
        return send(ws, { type: 'error', message: 'Комната заполнена' });
      }

      leave(ws);
      room.add(ws);
      ws.roomCode = code;
      send(ws, { type: 'joined', code });
      broadcast(code);
    }

    if (msg.type === 'leave') {
      leave(ws);
      send(ws, { type: 'left' });
    }
  });

  ws.on('close', () => leave(ws));
});

console.log('ABSOLUTE DEFENSE ONLINE SERVER: ' + PORT);
