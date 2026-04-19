import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { compileRouter }  from './routes/compile.js';
import { authRouter }     from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { adminRouter }    from './routes/admin.js';
import { initWebSocket }  from './services/websocket.js';

// Validação de variáveis de ambiente obrigatórias
if (!process.env.JWT_SECRET) {
  console.error('[ERRO] JWT_SECRET não definido. Copie .env.example para .env e configure.');
  process.exit(1);
}

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, '../public');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api', authRouter);
app.use('/api', projectsRouter);
app.use('/api', compileRouter);
app.use('/api', adminRouter);

app.use(express.static(CLIENT_DIR));

app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Bloquin server rodando em http://0.0.0.0:${PORT}`);
  console.log(`HUD disponível em    http://localhost:${PORT}/hud.html`);
  console.log(`WebSocket em         ws://0.0.0.0:${PORT}/ws`);
});
