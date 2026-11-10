import './Plus.css'

const recentRepositories: string[] = []

function Plus() {
  return (
    <div className="plus">
      <section className="plus__section" aria-labelledby="repository-options-title">
        <h1 className="plus__section-title" id="repository-options-title">
          Opciones de repositorio
        </h1>
        <div className="plus__actions" aria-label="Acciones de repositorio">
          <button className="plus__action" type="button">Abrir</button>
          <button className="plus__action" type="button">Clonar</button>
          <button className="plus__action" type="button">Init</button>
        </div>
      </section>

      <section className="plus__section" aria-labelledby="recent-repositories-title">
        <h2 className="plus__section-title" id="recent-repositories-title">
          Repositorios recientes
        </h2>
        {recentRepositories.length > 0 ? (
          <ul className="plus__repository-list">
            {recentRepositories.map((repository) => (
              <li className="plus__repository" key={repository}>
                {repository}
              </li>
            ))}
          </ul>
        ) : (
          <p className="plus__empty-state">Todavía no hay repositorios recientes.</p>
        )}
      </section>
    </div>
  )
}

export default Plus
