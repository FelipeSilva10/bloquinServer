import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { compileRouter }  from './routes/compile.js';
import { authRouter }     from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { initWebSocket }  from './services/websocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, '../client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API — prefixo /api, registrado antes do static para ter prioridade
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api', authRouter);
app.use('/api', projectsRouter);
app.use('/api', compileRouter);

// Frontend — arquivos estáticos em /client
app.use(express.static(CLIENT_DIR));

// SPA fallback: qualquer rota não-API serve o index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Bloquin server rodando em http://0.0.0.0:${PORT}`);
  console.log(`WebSocket disponível em  ws://0.0.0.0:${PORT}/ws`);
});
