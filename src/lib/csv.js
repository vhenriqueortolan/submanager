// Exportação das assinaturas em CSV, para abrir em planilha. Só leitura: não muda nenhum dado.
import { CYCLES, cycleOf } from './cycles.js';
import { MONTHS, WEEKDAYS } from './format.js';
import { statusOf } from './status.js';

export const CSV_FILENAME = 'submanager-assinaturas.csv';
export const CSV_HEADER = ['Nome', 'Categoria', 'Valor', 'Ciclo', 'Dia', 'Método', 'Status'];
const STATUS_LABEL = { active: 'Ativa', paused: 'Pausada', cancelled: 'Cancelada' };
const BOM = '﻿';

/**
 * Campo de texto digitado pela pessoa: planilhas executam como fórmula o que começa com = + - @ (ou tab e retorno).
 * O apóstrofo na frente faz o Excel e o Google Planilhas tratarem como texto.
 */
const texto = (valor) => {
  const s = String(valor ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

/** Escapa um campo: com `;`, aspas ou quebra de linha, vai entre aspas e as aspas internas dobram. */
export const campo = (valor) => {
  const s = String(valor ?? '');
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const valor = (price) => {
  if (price === '' || price === null || price === undefined) return '';
  const n = Number(price);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2).replace('.', ',') : '';
};

function dia(sub) {
  const ciclo = cycleOf(sub);
  if (ciclo === 'weekly') return WEEKDAYS[Number(sub.dueWeekday)] ?? '';
  if (!sub.dueDate) return '';
  if (ciclo === 'yearly') return MONTHS[Number(sub.dueMonth) - 1] ? `${sub.dueDate} de ${MONTHS[Number(sub.dueMonth) - 1]}` : String(sub.dueDate);
  return String(sub.dueDate);
}

/** CSV das assinaturas: separador `;`, vírgula decimal, UTF-8 com BOM e linhas terminadas em CRLF. */
export function assinaturasCsv(subs) {
  const linhas = subs.map((sub) =>
    [
      texto(sub.name),
      texto(sub.category),
      valor(sub.price),
      CYCLES[cycleOf(sub)].label,
      dia(sub),
      texto(sub.paymentMethod),
      STATUS_LABEL[statusOf(sub)] ?? '',
    ].map(campo).join(';'),
  );
  return BOM + [CSV_HEADER.join(';'), ...linhas].join('\r\n') + '\r\n';
}

/** Baixa o CSV no aparelho (mesmo mecanismo do backup). */
export function downloadCsv(subs) {
  const blob = new Blob([assinaturasCsv(subs)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = CSV_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
