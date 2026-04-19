import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.js';

const connections = new Map(); // userId → WebSocket

const AUTH_TIMEOUT_MS = 5_000;

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, _req) => {
    let userId = null;
    let authenticated = false;

    const authTimeout = setTimeout(() => {
      if (!authenticated) ws.close(4000, 'Timeout de autenticação.');
    }, AUTH_TIMEOUT_MS);

    ws.on('message', (data) => {
      if (!authenticated) {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type !== 'auth' || !msg.token) {
            ws.close(4001, 'Primeira mensagem deve ser { type: "auth", token }.');
            return;
          }
          const payload = jwt.verify(msg.token, JWT_SECRET);
          userId = payload.sub;
          authenticated = true;
          clearTimeout(authTimeout);

          const existing = connections.get(userId);
          if (existing && existing.readyState === WebSocket.OPEN) {
            existing.close(4001, 'Nova sessão iniciada em outra aba.');
          }

          connections.set(userId, ws);
          console.log(`[WS] Autenticado: ${userId}`);
          ws.send(JSON.stringify({ type: 'connected', userId }));
        } catch {
          clearTimeout(authTimeout);
          ws.close(4002, 'Token inválido.');
        }
        return;
      }
    });

    ws.on('close', () => {
      if (userId && connections.get(userId) === ws) {
        connections.delete(userId);
        console.log(`[WS] Desconectado: ${userId}`);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Erro (${userId ?? 'não autenticado'}):`, err.message);
    });
  });

  console.log('[WS] WebSocketServer inicializado em /ws');
  return wss;
}

export function send(userId, payload) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** Retorna array de userIds atualmente conectados via WS */
export function getConnectedUsers() {
  return [...connections.keys()];
}
