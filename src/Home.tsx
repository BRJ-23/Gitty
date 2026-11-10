import './Home.css'

const recentRepositories: string[] = []

function Home() {
  return (
    <div className="home">
      <section className="home__section" aria-labelledby="repository-options-title">
        <h1 className="home__section-title" id="repository-options-title">
          Opciones de repositorio
        </h1>
        <div className="home__actions" aria-label="Acciones de repositorio">
          <button className="home__action" type="button">Abrir</button>
          <button className="home__action" type="button">Clonar</button>
          <button className="home__action" type="button">Init</button>
        </div>
      </section>

      <section className="home__section" aria-labelledby="recent-repositories-title">
        <h2 className="home__section-title" id="recent-repositories-title">
          Repositorios recientes
        </h2>
        {recentRepositories.length > 0 ? (
          <ul className="home__repository-list">
            {recentRepositories.map((repository) => (
              <li className="home__repository" key={repository}>
                {repository}
              </li>
            ))}
          </ul>
        ) : (
          <p className="home__empty-state">Todavía no hay repositorios recientes.</p>
        )}
      </section>
    </div>
  )
}

export default Home
