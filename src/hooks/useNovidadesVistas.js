import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { VISTAS_KEY, comBase, comVista, lerVistas } from '../lib/novidades-vistas.js';

// Armazém compartilhado entre telas. A fonte é o localStorage (chave própria); se ele falhar, vale a memória da sessão.
const ouvintes = new Set();
let memoria = null;

function lerBruto() {
  try {
    return localStorage.getItem(VISTAS_KEY);
  } catch {
    return memoria;
  }
}

function gravar(vistas) {
  const texto = JSON.stringify(vistas);
  try {
    localStorage.setItem(VISTAS_KEY, texto);
  } catch {
    memoria = texto;
  }
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar) {
  ouvintes.add(avisar);
  const aoMudarEmOutraAba = (e) => (e.key === VISTAS_KEY || e.key === null) && avisar();
  window.addEventListener('storage', aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener('storage', aoMudarEmOutraAba);
  };
}

/**
 * Novidades já vistas. `dados`: o que useNovidades devolve; ao chegar, registra a base dos serviços novos (primeira vez: nada é novo).
 * `marcar(chave, iso)` marca como vistas as novidades do serviço até `iso`.
 */
export default function useNovidadesVistas(dados) {
  const bruto = useSyncExternalStore(assinar, lerBruto);
  const vistas = useMemo(() => lerVistas(bruto), [bruto]);

  // Parte do valor gravado agora (não do da renderização), para não desfazer uma marcação feita em outra aba ou tela.
  useEffect(() => {
    if (!dados) return;
    const atual = lerVistas(lerBruto());
    const novo = comBase(atual, dados);
    if (novo !== atual) gravar(novo);
  }, [dados, bruto]);

  const marcar = useCallback((chave, iso) => {
    const atual = lerVistas(lerBruto());
    const novo = comVista(atual, chave, iso);
    if (novo !== atual) gravar(novo);
  }, []);

  return { vistas, marcar };
}
