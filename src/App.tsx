import { useState } from 'react'
import Home from './Home'
import Pestañas, { type Tab } from './Pestañas'
import Plus from './Plus'
import './App.css'

const homeTab: Tab = { id: 'inicio', label: 'Inicio' }
const plusTab: Tab = { id: 'nuevo-repositorio', label: 'Nuevo repositorio' }

function App() {
  const [tabs, setTabs] = useState<Tab[]>([homeTab])
  const [activeTabId, setActiveTabId] = useState(homeTab.id)

  const openPlusTab = () => {
    setTabs((currentTabs) =>
      currentTabs.some((tab) => tab.id === plusTab.id)
        ? currentTabs
        : [...currentTabs, plusTab],
    )
    setActiveTabId(plusTab.id)
  }

  return (
    <main className="app">
      <Pestañas
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onAdd={openPlusTab}
      />
      <section className="app__content" aria-label="Contenido de la pestaña">
        {activeTabId === 'inicio' ? <Home /> : null}
        {activeTabId === plusTab.id ? <Plus /> : null}
      </section>
    </main>
  )
}

export default App
