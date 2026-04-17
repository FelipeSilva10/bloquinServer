import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.js';

/**
 * Mapa de conexões ativas.
 * Chave: userId (extraído do JWT)  →  Valor: instância WebSocket
 */
const connections = new Map();

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.replace('/ws?', ''));
    const token  = params.get('token');

    // Valida o JWT — recusa conexão sem token válido
    let userId;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      userId = payload.sub;
    } catch {
      ws.close(1008, 'Token inválido ou ausente.');
      return;
    }

    connections.set(userId, ws);
    console.log(`[WS] Conectado: ${userId}`);

    ws.on('close', () => {
      if (connections.get(userId) === ws) connections.delete(userId);
      console.log(`[WS] Desconectado: ${userId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Erro (${userId}):`, err.message);
    });

    send(userId, { type: 'connected', userId });
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
