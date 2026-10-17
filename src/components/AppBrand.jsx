export function BrandMark({ className = 'app-logo-svg' }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="120" style={{ fill: 'var(--color-bg)' }} />
      <path
        d="M160 110h192v64H224v64h96a64 64 0 0 1 64 64v64a64 64 0 0 1-64 64H160v-64h128v-64H192a64 64 0 0 1-64-64v-64a64 64 0 0 1 64-64z"
        style={{ fill: 'var(--color-text)' }}
      />
    </svg>
  );
}

export default function AppBrand({ title }) {
  return (
    <div className="app-brand">
      <BrandMark />
      <span className="brand-name">{title}</span>
    </div>
  );
}
