import { readFileSync } from 'node:fs';
import { test, expect, seed, withSubs, sampleSubs, openProfileScreen, readStorage } from './fixtures.js';

const baixar = async (page) => {
  await openProfileScreen(page, 'Dados e privacidade');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar assinaturas (CSV)' }).click(),
  ]);
  return download;
};

test('exportar baixa submanager-assinaturas.csv com BOM, separador ; e vírgula decimal', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const download = await baixar(page);
  expect(download.suggestedFilename()).toBe('submanager-assinaturas.csv');
  const bytes = readFileSync(await download.path());
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const linhas = bytes.toString('utf8').replace('﻿', '').split('\r\n').filter(Boolean);
  expect(linhas[0]).toBe('Nome;Categoria;Valor;Ciclo;Dia;Método;Status');
  expect(linhas).toHaveLength(1 + sampleSubs().length);
  const colunas = linhas.find((l) => l.startsWith('HojeApp;')).split(';');
  expect(colunas).toHaveLength(7);
  expect(colunas.slice(0, 4)).toEqual(['HojeApp', 'IA', '50,00', 'Mensal']);
  expect(colunas[5]).toBe('Pix');
  expect(colunas[6]).toBe('Ativa');
});

test('acentos e campos com ; ou aspas saem preservados e escapados', async ({ page }) => {
  const [hoje] = sampleSubs();
  await seed(page, withSubs([{ ...hoje, name: 'Café; "Prêmio"', category: 'Dia a Dia', price: 4.9, paymentMethod: 'Cartão' }]));
  const download = await baixar(page);
  const texto = readFileSync(await download.path(), 'utf8');
  expect(texto).toContain('"Café; ""Prêmio""";Dia a Dia;4,90;Mensal;');
  expect(texto).toContain(';Cartão;Ativa');
});

// lastNotified é gravado sozinho pelos avisos de vencimento logo após abrir o app; não tem relação com a exportação.
const semAvisos = (state) => ({ ...state, subs: state.subs.map(({ lastNotified, ...resto }) => resto) }); // eslint-disable-line no-unused-vars

test('exportar não altera os dados do app', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const antes = semAvisos(await readStorage(page));
  await baixar(page);
  expect(semAvisos(await readStorage(page))).toEqual(antes);
});
