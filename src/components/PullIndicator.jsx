import { pullProgress } from '../lib/pull.js';

/** Indicador do puxar para atualizar: desce com o dedo e gira enquanto atualiza. */
export default function PullIndicator({ distance, refreshing }) {
  if (!refreshing && distance <= 0) return null;
  const shown = refreshing ? 1 : pullProgress(distance);
  return (
    <div
      className="pull-indicator"
      style={{ transform: `translateY(${refreshing ? 'var(--space-8)' : `${distance}px`})`, opacity: shown }}
      role={refreshing ? 'progressbar' : undefined}
      aria-label={refreshing ? 'Atualizando' : undefined}
      aria-hidden={refreshing ? undefined : true}
    >
      <div className={`pull-spinner${refreshing ? ' spinning' : ''}`} style={refreshing ? undefined : { transform: `rotate(${shown * 270}deg)` }} />
    </div>
  );
}
