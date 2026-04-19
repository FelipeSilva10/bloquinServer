import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.js';

/**
 * Mapa de conexões ativas.
 * Chave: userId → WebSocket
 *
 * FIX #7: antes de registrar nova conexão, a anterior era silenciosamente
 * sobrescrita. Agora é fechada explicitamente com código 4001.
 */
const connections = new Map();

/** Timeout para receber mensagem de autenticação após conectar (ms) */
const AUTH_TIMEOUT_MS = 5_000;

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, _req) => {
    /**
     * FIX #3: token NÃO vem mais na query string (URL logada por proxies/access logs).
     * O cliente deve enviar como primeira mensagem JSON:
     *   { type: 'auth', token: '<JWT>' }
     *
     * Se a mensagem não chegar em AUTH_TIMEOUT_MS, a conexão é encerrada.
     */
    let userId = null;
    let authenticated = false;

    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(4000, 'Timeout de autenticação.');
      }
    }, AUTH_TIMEOUT_MS);

    ws.on('message', (data) => {
      // Fase de autenticação — processa apenas a mensagem inicial
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

          // FIX #7: fechar conexão anterior do mesmo usuário antes de registrar
          const existing = connections.get(userId);
          if (existing && existing.readyState === WebSocket.OPEN) {
            existing.close(4001, 'Nova sessão iniciada em outra aba.');
            console.log(`[WS] Conexão anterior de ${userId} encerrada (nova aba).`);
          }

          connections.set(userId, ws);
          console.log(`[WS] Autenticado: ${userId}`);

          // Confirma autenticação
          ws.send(JSON.stringify({ type: 'connected', userId }));
        } catch (err) {
          clearTimeout(authTimeout);
          ws.close(4002, 'Token inválido.');
        }
        return;
      }

      // Mensagens pós-autenticação (extensível — por ora ignoradas)
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

  console.log('[WS] WebSocketServer inicializado em /ws (auth via primeira mensagem)');
  return wss;
}

export function send(userId, payload) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
