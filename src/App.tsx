import { useState } from 'react'
import Home from './Home'
import Pestañas, { type Tab } from './Pestañas'
import './App.css'

const tabs: Tab[] = [{ id: 'inicio', label: 'Inicio' }]

function App() {
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)

  return (
    <main className="app">
      <Pestañas
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
      />
      <section className="app__content" aria-label="Contenido de la pestaña">
        {activeTabId === 'inicio' ? <Home /> : null}
      </section>
    </main>
  )
}

export default App
