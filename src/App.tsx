import { useState } from 'react'
import Home from './Home'
import Pestañas, { type Tab } from './Pestañas'
import Plus from './Plus'
import Proyecto from './Proyecto'
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

  const openProjectTab = (folderPath: string) => {
    const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop() || folderPath
    const projectTab: Tab = {
      id: `proyecto-${encodeURIComponent(folderPath)}`,
      label: folderName,
    }

    setTabs((currentTabs) => {
      if (currentTabs.some((tab) => tab.id === projectTab.id)) {
        return currentTabs.filter((tab) => tab.id !== plusTab.id)
      }

      let replacedPlusTab = false
      const updatedTabs = currentTabs.map((tab) => {
        if (tab.id !== plusTab.id) {
          return tab
        }

        replacedPlusTab = true
        return projectTab
      })

      return replacedPlusTab ? updatedTabs : [...updatedTabs, projectTab]
    })
    setActiveTabId(projectTab.id)
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
        {activeTabId === plusTab.id ? (
          <Plus onFolderSelected={openProjectTab} />
        ) : null}
        {activeTabId !== homeTab.id && activeTabId !== plusTab.id ? (
          <Proyecto />
        ) : null}
      </section>
    </main>
  )
}

export default App
