/**
 * seed.js — Popula o banco com usuários iniciais para testes.
 *
 * Uso: node --experimental-sqlite scripts/seed.js
 *
 * Cria:
 *   - 1 professor:   prof / prof123
 *   - 15 alunos:     aluno01…aluno15 / aluno123
 *
 * Idempotente: ignora usuários já existentes (INSERT OR IGNORE).
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { run, all } from '../src/db/index.js';

const SALT_ROUNDS = 10;

async function seed() {
  console.log('Iniciando seed...\n');

  // Professor
  const profHash = await bcrypt.hash('prof123', SALT_ROUNDS);
  run(
    'INSERT OR IGNORE INTO users (id, username, password, name, role) VALUES (?,?,?,?,?)',
    [uuidv4(), 'prof', profHash, 'Professor', 'teacher']
  );
  console.log('✓ Professor criado: prof / prof123');

  // 15 alunos
  const alunoHash = await bcrypt.hash('aluno123', SALT_ROUNDS);
  for (let i = 1; i <= 15; i++) {
    const username = `aluno${String(i).padStart(2, '0')}`;
    const name     = `Aluno ${String(i).padStart(2, '0')}`;
    run(
      'INSERT OR IGNORE INTO users (id, username, password, name, role) VALUES (?,?,?,?,?)',
      [uuidv4(), username, alunoHash, name, 'student']
    );
  }
  console.log('✓ 15 alunos criados: aluno01…aluno15 / aluno123');

  // Confirmar
  const total = all('SELECT role, COUNT(*) as n FROM users GROUP BY role');
  console.log('\nUsuários no banco:');
  total.forEach(r => console.log(`  ${r.role}: ${r.n}`));
  console.log('\nSeed concluído.');
}

seed().catch(console.error);
