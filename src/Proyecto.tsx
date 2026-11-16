import './Proyecto.css'

function Proyecto() {
  return (
    <div className="project-window">
      <div className="project-window__toolbar" aria-label="Barra de opciones superior">
        <span className="project-window__toolbar-title">Proyecto</span>
        <div className="project-window__toolbar-options">
          <span>Archivo</span>
          <span>Editar</span>
          <span>Ver</span>
        </div>
      </div>

      <div className="project-window__workspace">
        <aside
          className="project-window__panel project-window__sidebar"
          aria-label="Menú de opciones"
        >
          <h2 className="project-window__panel-title">Opciones</h2>
        </aside>

        <div
          className="project-window__center"
          role="region"
          aria-label="Área de trabajo"
        />

        <aside
          className="project-window__panel project-window__details"
          aria-label="Información del elemento seleccionado"
        >
          <h2 className="project-window__panel-title">Detalles</h2>
          <p className="project-window__empty-message">
            Selecciona un elemento para ver su información.
          </p>
        </aside>
      </div>
    </div>
  )
}

export default Proyecto
