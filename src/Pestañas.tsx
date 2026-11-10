import './Pestañas.css'

export type Tab = {
  id: string
  label: string
}

type PestañasProps = {
  tabs: Tab[]
  activeTabId: string
  onSelect: (tabId: string) => void
  onAdd: () => void
}

function Pestañas({ tabs, activeTabId, onSelect, onAdd }: PestañasProps) {
  return (
    <nav className="tabs" aria-label="Pestañas">
      <div className="tabs__list" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTabId === tab.id}
            className={`tabs__item${activeTabId === tab.id ? ' tabs__item--active' : ''}`}
            id={`tab-${tab.id}`}
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        aria-label="Abrir una nueva pestaña"
        className="tabs__add"
        onClick={onAdd}
        type="button"
      >
        +
      </button>
    </nav>
  )
}

export default Pestañas
