// Puxar para atualizar: regras puras do gesto (sem React nem DOM), para testar sem navegador.

/** Quanto o indicador precisa descer (já com a resistência) para o gesto disparar ao soltar. */
export const PULL_THRESHOLD = 70;
/** Fração do movimento do dedo que o indicador acompanha: puxa "pesado". */
export const PULL_RESISTANCE = 0.5;
/** Teto da descida do indicador. */
export const PULL_MAX = 110;

/** Descida do indicador para um deslocamento do dedo: com resistência, nunca negativa, com teto. */
export function pullDistance(deltaY) {
  if (!(deltaY > 0)) return 0;
  return Math.min(deltaY * PULL_RESISTANCE, PULL_MAX);
}

/** Soltar com o indicador no limiar (ou além) dispara a atualização. */
export const shouldTrigger = (distance) => distance >= PULL_THRESHOLD;

/** Progresso de 0 a 1 até o limiar, para o indicador "armar". */
export const pullProgress = (distance) => Math.max(0, Math.min(distance / PULL_THRESHOLD, 1));

/**
 * O gesto só começa com a página no topo, sem tela, folha ou diálogo aberto e com um dedo só.
 * @param {{scrollY: number, openScreens: number, locked: boolean, touches: number, refreshing: boolean}} s
 * `locked`: rolagem do body travada por um diálogo.
 */
export function canStartPull({ scrollY, openScreens, locked, touches, refreshing }) {
  return scrollY <= 0 && openScreens === 0 && !locked && touches === 1 && !refreshing;
}

/** Um gesto mais horizontal que vertical é rolagem lateral ou deslize, não puxão. */
export const isVerticalPull = (dx, dy) => dy > 0 && dy > Math.abs(dx);
