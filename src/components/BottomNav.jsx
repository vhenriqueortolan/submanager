const ITEMS = [
  { id: 'home', icon: '📁', label: 'Portfólio' },
  { id: 'discover', icon: '🧭', label: 'Descobrir' },
  { id: 'profile', icon: '⚙️', label: 'Perfil' },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item${tab === item.id ? ' active' : ''}`}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <div className="nav-icon" aria-hidden="true">{item.icon}</div>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
