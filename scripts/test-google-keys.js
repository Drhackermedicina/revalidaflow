import { readFileSync } from 'fs';
import { performance } from 'node:perf_hooks';
import path from 'path';
import process from 'process';

const TARGET_PREFIXES = [
  'GOOGLE_API_KEY_',
  'VITE_GOOGLE_API_KEY_'
];

const TARGET_KEYS = [
  'GEMINI_API_KEY',
  'VITE_GEMINI_API_KEY'
];

const ENV_FILENAME = '.env';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Não foi possível ler ${envPath}: ${error.message}`);
  }
}

function parseEnv(content) {
  const entries = [];

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      !TARGET_KEYS.includes(key) &&
      !TARGET_PREFIXES.some(prefix => key.startsWith(prefix))
    ) {
      continue;
    }

    if (!value) {
      continue;
    }

    // Remover aspas simples ou duplas que envolvem o valor inteiro
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}

function buildKeyGroups(entries) {
  const map = new Map();

  for (const entry of entries) {
    const { key, value } = entry;

    if (!value) {
      continue;
    }

    const current = map.get(value) ?? { names: [], value };
    current.names.push(key);
    map.set(value, current);
  }

  return Array.from(map.values());
}

function maskKey(value) {
  if (!value || value.length < 8) {
    return '***';
  }

  const start = value.slice(0, 4);
  const end = value.slice(-4);
  return `${start}***${end}`;
}

async function testKey(value) {
  const url = `${BASE_URL}?key=${value}`;
  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const duration = Math.round(performance.now() - start);
    let body;
    try {
      body = await response.json();
    } catch (error) {
      body = { raw: await response.text() };
    }

    if (response.ok) {
      return {
        status: 'válida',
        httpStatus: response.status,
        durationMs: duration,
        details: `Modelos disponíveis: ${Array.isArray(body.models) ? body.models.length : 'desconhecido'}`
      };
    }

    const errorMessage = body?.error?.message || body?.error?.status || response.statusText;
    return {
      status: 'inválida',
      httpStatus: response.status,
      durationMs: duration,
      details: errorMessage || 'Erro desconhecido'
    };
  } catch (error) {
    return {
      status: 'erro',
      httpStatus: null,
      durationMs: null,
      details: error.message
    };
  }
}

async function main() {
  const projectRoot = process.cwd();
  const envPath = path.resolve(projectRoot, ENV_FILENAME);

  console.log('🔍 Iniciando verificação das chaves Gemini/Google AI...');
  console.log(`📄 Arquivo analisado: ${envPath}`);

  const envContent = loadEnvFile(envPath);
  const entries = parseEnv(envContent);

  if (entries.length === 0) {
    console.log('⚠️ Nenhuma chave alvo encontrada no arquivo .env.');
    process.exit(0);
  }

  const groups = buildKeyGroups(entries);

  console.log(`🔑 Chaves encontradas: ${entries.length} (valores únicos: ${groups.length})`);

  for (const [index, group] of groups.entries()) {
    const { value, names } = group;
    console.log('\n──────────────────────────────────────────────────────────────');
    console.log(`Grupo #${index + 1}`);
    console.log(`Variáveis: ${names.join(', ')}`);
    console.log(`Valor (mascarado): ${maskKey(value)}`);

    if (!value) {
      console.log('⚠️ Valor vazio, pulando teste.');
      continue;
    }

    console.log('⏳ Testando chave...');
    const result = await testKey(value);

    if (result.status === 'válida') {
      console.log(`✅ Chave válida | HTTP ${result.httpStatus} | ${result.durationMs}ms | ${result.details}`);
    } else if (result.status === 'inválida') {
      console.log(`❌ Chave inválida | HTTP ${result.httpStatus} | ${result.details}`);
    } else {
      console.log(`⚠️ Erro de teste | ${result.details}`);
    }

    // Evitar exceder rate limits com uma pequena pausa entre chamadas
    await sleep(300);
  }

  console.log('\n✅ Verificação concluída.');
}

main().catch(error => {
  console.error('Erro inesperado durante a verificação das chaves:', error);
  process.exit(1);
});

