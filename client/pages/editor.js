/**
 * pages/editor.js
 * Editor principal: Blockly + compilação + projetos + download binário.
 */

/* global Blockly */
import api from '../services/api.js';
import ws  from '../services/websocket.js';
import { BloquinGenerator } from '../components/blocks.js';

// ── Estado ──────────────────────────────────────────────────────────────────
let workspace       = null;
let currentProject  = null;   // { id, name, blocks_xml }
let saveDebounce    = null;
let currentJobId    = null;
let lastBinaryBlob  = null;

// ── Elementos DOM ────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Inicialização ────────────────────────────────────────────────────────────
export function initEditor(user) {
  $('page-editor').classList.remove('hidden');
  $('user-label').textContent = `${user.name}`;

  initBlockly();
  initTopbar();
  initCompilePanel();
  ws.connect();
  loadProjects();
}

// ── Blockly ──────────────────────────────────────────────────────────────────
function initBlockly() {
  workspace = Blockly.inject('blockly-div', {
    toolbox: document.getElementById('toolbox'),
    theme: Blockly.Themes.Classic,
    grid: { spacing: 20, length: 3, colour: '#f0efea', snap: true },
    zoom:  { controls: true, wheel: true, startScale: 1.0 },
    trashcan: true,
  });

  // Auto-save ao modificar workspace
  workspace.addChangeListener((e) => {
    if (e.isUiEvent) return;
    if (!currentProject) return;
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => saveCurrentProject(), 2000);
  });

  // Inserir bloco setup/loop padrão se workspace vazio
  addDefaultSetupLoop();
}

function addDefaultSetupLoop() {
  const existing = workspace.getBlocksByType('blq_setup_loop');
  if (existing.length > 0) return;

  const block = workspace.newBlock('blq_setup_loop');
  block.initSvg();
  block.render();
  block.moveBy(40, 40);
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function initTopbar() {
  $('btn-save').addEventListener('click', () => saveCurrentProject(true));
  $('btn-new-project').addEventListener('click', newProject);
  $('btn-logout').addEventListener('click', async () => {
    await api.logout();
    ws.disconnect();
    location.reload();
  });

  $('project-name-input').addEventListener('change', () => {
    if (!currentProject) return;
    currentProject.name = $('project-name-input').value.trim();
    saveCurrentProject();
  });
}

// ── Projetos ──────────────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    const { projects } = await api.listProjects();
    renderProjectList(projects);

    if (projects.length > 0) {
      await openProject(projects[0].id);
    } else {
      await newProject();
    }
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
  }
}

function renderProjectList(projects) {
  const list = $('project-list');
  list.innerHTML = '';

  if (projects.length === 0) {
    list.innerHTML = '<p style="font-size:12px;color:var(--text-muted);padding:8px 10px">Nenhum projeto.</p>';
    return;
  }

  for (const p of projects) {
    const item = document.createElement('div');
    item.className = 'project-item' + (currentProject?.id === p.id ? ' active' : '');
    item.dataset.id = p.id;
    item.innerHTML = `<span title="${p.name}">${p.name}</span>
      <button title="Excluir projeto">✕</button>`;

    item.querySelector('span').addEventListener('click', () => openProject(p.id));
    item.querySelector('button').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir "${p.name}"?`)) return;
      await api.deleteProject(p.id);
      if (currentProject?.id === p.id) currentProject = null;
      loadProjects();
    });

    list.appendChild(item);
  }
}

async function openProject(id) {
  try {
    const { project } = await api.getProject(id);
    currentProject = project;
    $('project-name-input').value = project.name;

    // Carregar blocos XML no workspace
    workspace.clear();
    if (project.blocks_xml && project.blocks_xml.trim() !== '') {
      try {
        const xml = Blockly.utils.xml.textToDom(project.blocks_xml);
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch {
        addDefaultSetupLoop();
      }
    } else {
      addDefaultSetupLoop();
    }

    // Marcar projeto ativo na lista
    document.querySelectorAll('.project-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  } catch (err) {
    console.error('Erro ao abrir projeto:', err);
  }
}

async function newProject() {
  const name = `Projeto ${new Date().toLocaleDateString('pt-BR')}`;
  try {
    const { project } = await api.createProject(name);
    currentProject = { ...project, blocks_xml: '' };
    $('project-name-input').value = project.name;
    workspace.clear();
    addDefaultSetupLoop();
    loadProjects();
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
  }
}

async function saveCurrentProject(showFeedback = false) {
  if (!currentProject) return;

  const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
  const name = $('project-name-input').value.trim() || currentProject.name;

  try {
    await api.saveProject(currentProject.id, { name, blocks_xml: xml });
    currentProject.blocks_xml = xml;
    currentProject.name = name;
    if (showFeedback) appendLog('✓ Projeto salvo.', 'success');
  } catch (err) {
    console.error('Erro ao salvar projeto:', err);
    if (showFeedback) appendLog('✗ Erro ao salvar.', 'error');
  }
}

// ── Compilação ───────────────────────────────────────────────────────────────
function initCompilePanel() {
  $('btn-compile').addEventListener('click', startCompile);
  $('btn-download').addEventListener('click', downloadBinary);
}

async function startCompile() {
  $('btn-compile').disabled = true;
  $('btn-download').classList.add('hidden');
  lastBinaryBlob = null;
  currentJobId   = null;
  clearLog();

  // Salvar antes de compilar
  await saveCurrentProject();

  // Gerar código C++
  let code;
  try {
    code = BloquinGenerator.workspaceToCode(workspace);
  } catch (err) {
    setStatus('error', 'Erro ao gerar código.');
    appendLog(err.message, 'error');
    $('btn-compile').disabled = false;
    return;
  }

  appendLog('Gerando código...', 'info');
  appendLog(code.split('\n').slice(0, 6).join('\n') + '\n...', 'info');

  try {
    const { jobId, position } = await api.compile(code);
    currentJobId = jobId;

    setStatus('queued', `Na fila — posição ${position}`);
    appendLog(`Job ${jobId.slice(0,8)}... enfileirado.`, 'info');

    // Registrar handler WebSocket para este job
    ws.onJob(jobId, handleJobEvent);

  } catch (err) {
    setStatus('error', err.message);
    appendLog(err.message, 'error');
    $('btn-compile').disabled = false;
  }
}

function handleJobEvent(event) {
  switch (event.type) {
    case 'queued':
      setStatus('queued', `Na fila — posição ${event.position}`);
      break;
    case 'compiling':
      setStatus('compiling', 'Compilando...');
      appendLog('Compilando no servidor...', 'info');
      break;
    case 'done':
      setStatus('done', 'Compilação concluída ✓');
      appendLog('✓ Compilação concluída!', 'success');
      $('btn-download').classList.remove('hidden');
      $('btn-compile').disabled = false;
      ws.offJob(event.jobId);
      break;
    case 'error':
      setStatus('error', 'Erro na compilação');
      appendLog('✗ Erro na compilação:', 'error');
      if (event.stderr) appendLog(event.stderr, 'error');
      else if (event.message) appendLog(event.message, 'error');
      $('btn-compile').disabled = false;
      ws.offJob(event.jobId);
      break;
  }
}

async function downloadBinary() {
  if (!currentJobId) return;

  $('btn-download').disabled = true;

  try {
    if (!lastBinaryBlob) {
      lastBinaryBlob = await api.downloadBinary(currentJobId);
    }

    // Criar link temporário e acionar download
    const url  = URL.createObjectURL(lastBinaryBlob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${currentProject?.name || 'firmware'}.bin`;
    link.click();
    URL.revokeObjectURL(url);

    appendLog('Binário baixado. Conecte o ESP32 para gravar.', 'success');
  } catch (err) {
    appendLog('Erro ao baixar binário: ' + err.message, 'error');
  } finally {
    $('btn-download').disabled = false;
  }
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────
function setStatus(state, text) {
  const dot = $('status-dot');
  dot.className = `status-dot ${state}`;
  $('status-text').textContent = text;
}

function clearLog() {
  $('compile-log').innerHTML = '';
}

function appendLog(text, type = '') {
  const log  = $('compile-log');
  const line = document.createElement('div');
  if (type) line.className = `log-${type}`;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
