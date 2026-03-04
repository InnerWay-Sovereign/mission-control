/**
 * seed-innerway-agents.mjs
 * Reads InnerWay's config/agent_registry.yaml and upserts agents into
 * Mission Control's SQLite database.
 *
 * Usage: node scripts/seed-innerway-agents.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MC_ROOT = resolve(__dirname, '..');
const IW_ROOT = resolve(MC_ROOT, '..', '..');  // innerway-sovereign/

// Registry path
const REGISTRY_PATH = resolve(IW_ROOT, 'config', 'agent_registry.yaml');
if (!existsSync(REGISTRY_PATH)) {
  console.error(`Registry not found: ${REGISTRY_PATH}`);
  process.exit(1);
}

// DB path (matches .env MISSION_CONTROL_DB_PATH default)
const DB_PATH = resolve(MC_ROOT, '.data', 'mission-control.db');
if (!existsSync(DB_PATH)) {
  console.error(`DB not found: ${DB_PATH} — start the app first to initialise the database.`);
  process.exit(1);
}

// --- Parse YAML (simple line-by-line, handles flat list of agents) ---
function parseRegistry(yaml) {
  const agents = [];
  let current = null;
  for (const raw of yaml.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#') || line === '' || line === 'agents:') continue;
    if (line.startsWith('- name:')) {
      if (current) agents.push(current);
      current = { name: line.replace('- name:', '').trim() };
    } else if (current) {
      const m = line.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (m) current[m[1]] = m[2].trim();
    }
  }
  if (current) agents.push(current);
  return agents;
}

const yaml = readFileSync(REGISTRY_PATH, 'utf8');
const agents = parseRegistry(yaml);
console.log(`Parsed ${agents.length} agents from registry.`);

// --- Upsert into SQLite ---
const db = new Database(DB_PATH);

const upsert = db.prepare(`
  INSERT INTO agents (name, role, status, config, workspace_id, created_at, updated_at)
  VALUES (@name, @role, @status, @config, 1, unixepoch(), unixepoch())
  ON CONFLICT(name) DO UPDATE SET
    role = excluded.role,
    config = excluded.config,
    updated_at = unixepoch()
`);

// Ensure agents table has a unique constraint on name (for ON CONFLICT to work)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name, workspace_id)');
} catch {}

const insert = db.transaction((agents) => {
  for (const a of agents) {
    const config = JSON.stringify({
      module_path: a.module_path,
      class_name: a.class_name,
      tag: a.tag,
      description: a.description,
      source: 'innerway_registry'
    });
    upsert.run({
      name: a.name,
      role: a.agent_role || 'Worker',
      status: 'offline',
      config
    });
    console.log(`  ✓ ${a.name} (${a.agent_role || 'Worker'})`);
  }
});

insert(agents);
console.log(`\nSeeded ${agents.length} InnerWay agents into Mission Control.`);
db.close();
