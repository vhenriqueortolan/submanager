// Gera public/feeds/novidades.json. Roda sozinho antes do `npm run build` (script `prebuild`).
//   node scripts/feeds/build-feed.mjs            busca os feeds
//   node scripts/feeds/build-feed.mjs --offline  não usa a rede; serviços com feed ficam com status "erro"
// Falha de rede nunca derruba o build: sai sempre com código 0.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { gerarNovidades } from '../../src/lib/feed-build.js';

const AQUI = import.meta.dirname;
const FONTES = resolve(AQUI, 'fontes.json');
const SAIDA = resolve(AQUI, '../../public/feeds/novidades.json');
const log = (texto) => process.stdout.write(`[feeds] ${texto}\n`);

try {
  const fontes = JSON.parse(readFileSync(FONTES, 'utf8'));
  const offline = process.argv.includes('--offline');
  const dados = await gerarNovidades(fontes, { offline });
  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA, JSON.stringify(dados, null, 2) + '\n');
  const resumo = Object.entries(dados.servicos).map(([d, s]) => `${d}: ${s.status}${s.itens.length ? ` (${s.itens.length})` : ''}`);
  log(`novidades.json gerado${offline ? ' (offline)' : ''} — ${resumo.join(', ')}`);
} catch (erro) {
  log(`não foi possível gerar novidades.json: ${erro.message}`);
}
