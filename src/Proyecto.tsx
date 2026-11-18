import { useEffect, useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import { FitAddon } from 'xterm-addon-fit'
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css'
import './Proyecto.css'

type ProyectoProps = {
  folderPath: string
}

type CommitGraphNodeProps = {
  imageSrc?: string
}

function CommitGraphNode({ imageSrc }: CommitGraphNodeProps) {
  return (
    <span className="project-window__commit-graph-node">
      {imageSrc ? (
        <img
          className="project-window__commit-graph-image"
          src={imageSrc}
          alt=""
        />
      ) : (
        <UserRound size={13} aria-hidden="true" />
      )}
    </span>
  )
}

function formatCommitDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const dateText = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(date)
  const timeText = timeParts
    .map((part) =>
      part.type === 'hour' && part.value.length === 1
        ? `\u00a0\u00a0${part.value}`
        : part.value,
    )
    .join('')

  return `${dateText}\u00a0\u00a0${timeText}`
}

function TerminalPanel({ folderPath }: ProyectoProps) {
  const terminalElementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const terminalElement = terminalElementRef.current
    if (!terminalElement) {
      return
    }

    const styles = getComputedStyle(terminalElement)
    const fitAddon = new FitAddon()
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      theme: {
        background:
          styles.getPropertyValue('--color-very-dark').trim() || '#131418',
        foreground: styles.color,
      },
    })
    terminal.loadAddon(fitAddon)
    terminal.open(terminalElement)
    fitAddon.fit()
    terminal.focus()

    let terminalId: string | null = null
    let disposed = false
    let pendingInput = ''
    const pendingOutput: Array<{ id: string; data: string }> = []

    const reportError = (action: string, error: unknown) => {
      console.error(`No se pudo ${action} la terminal.`, error)
      if (!disposed) {
        const message =
          error instanceof Error ? error.message : 'Error desconocido.'
        terminal.writeln(`\r\n[Error al ${action} la terminal: ${message}]`)
      }
    }

    const removeOutputListener = window.projectTerminal.onData((id, data) => {
      if (id === terminalId) {
        terminal.write(data)
      } else if (terminalId === null) {
        pendingOutput.push({ id, data })
      }
    })
    const removeExitListener = window.projectTerminal.onExit((id, exitCode) => {
      if (id === terminalId) {
        terminal.writeln(`\r\n[El proceso terminó con código ${exitCode}.]`)
        terminalId = null
        terminal.options.disableStdin = true
      }
    })
    const inputListener = terminal.onData((data) => {
      if (terminalId) {
        void window.projectTerminal
          .write(terminalId, data)
          .catch((error: unknown) => reportError('escribir en', error))
      } else {
        pendingInput += data
      }
    })
    const resizeListener = terminal.onResize(({ cols, rows }) => {
      if (terminalId) {
        void window.projectTerminal
          .resize(terminalId, cols, rows)
          .catch((error: unknown) => reportError('redimensionar', error))
      }
    })
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(terminalElement)

    void window.projectTerminal
      .start(folderPath, terminal.cols, terminal.rows)
      .then((id) => {
        if (disposed) {
          void window.projectTerminal
            .close(id)
            .catch((error: unknown) => reportError('cerrar', error))
          return
        }

        terminalId = id
        for (const output of pendingOutput) {
          if (output.id === id) {
            terminal.write(output.data)
          }
        }
        pendingOutput.length = 0

        if (pendingInput) {
          const input = pendingInput
          pendingInput = ''
          void window.projectTerminal
            .write(id, input)
            .catch((error: unknown) => reportError('escribir en', error))
        }

        void window.projectTerminal
          .resize(id, terminal.cols, terminal.rows)
          .catch((error: unknown) => reportError('redimensionar', error))
      })
      .catch((error: unknown) => {
        pendingInput = ''
        terminal.options.disableStdin = true
        reportError('iniciar', error)
      })

    return () => {
      disposed = true
      resizeObserver.disconnect()
      inputListener.dispose()
      resizeListener.dispose()
      removeOutputListener()
      removeExitListener()
      terminal.dispose()

      if (terminalId) {
        void window.projectTerminal
          .close(terminalId)
          .catch((error: unknown) => reportError('cerrar', error))
      }
    }
  }, [folderPath])

  return (
    <div
      ref={terminalElementRef}
      className="project-window__terminal"
      role="region"
      aria-label="Terminal"
    />
  )
}

function Proyecto({ folderPath }: ProyectoProps) {
  const [commits, setCommits] = useState<GitCommitInfo[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    let active = true
    setHistoryLoading(true)
    setHistoryError(null)

    void window.ipcRenderer
      .getGitHistory(folderPath)
      .then((history) => {
        if (active) {
          setCommits(history)
        }
      })
      .catch((error: unknown) => {
        console.error('No se pudo cargar el historial Git.', error)
        if (active) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el historial Git.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [folderPath])

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
        >
          <div
            className="project-window__center-main"
            role="region"
            aria-label="Historial del proyecto"
          >
            <table className="project-window__commit-table">
              <thead>
                <tr>
                  <th className="project-window__commit-refs" scope="col">
                    Branch/tag
                  </th>
                  <th className="project-window__commit-sha" scope="col">
                    SHA
                  </th>
                  <th className="project-window__commit-graph-heading" scope="col">
                    Gráfico
                  </th>
                  <th className="project-window__commit-comment" scope="col">
                    Comentario
                  </th>
                  <th scope="col">Autor</th>
                  <th scope="col">Fecha/hora</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td className="project-window__history-message" colSpan={6}>
                      Cargando historial…
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td
                      className="project-window__history-message project-window__history-message--error"
                      colSpan={6}
                    >
                      {historyError}
                    </td>
                  </tr>
                ) : commits.length === 0 ? (
                  <tr>
                    <td className="project-window__history-message" colSpan={6}>
                      No hay commits para mostrar.
                    </td>
                  </tr>
                ) : (
                  commits.map((commit) => (
                    <tr className="project-window__commit-row" key={commit.hash}>
                      <td className="project-window__commit-refs">
                        {commit.branchTags.length > 0 ? (
                          <div className="project-window__ref-list">
                            {commit.branchTags.map((ref) => (
                              <span
                                className="project-window__ref"
                                key={ref}
                              >
                                {ref}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="project-window__commit-sha">
                        <code title={commit.hash}>{commit.hash.slice(0, 7)}</code>
                      </td>
                      <td
                        className="project-window__commit-graph"
                        aria-label={`Gráfico del commit ${commit.hash.slice(0, 7)}`}
                      >
                        <span
                          className="project-window__commit-graph-track"
                          aria-hidden="true"
                        >
                          <span className="project-window__commit-graph-connector" />
                          <span className="project-window__commit-graph-terminal" />
                          <CommitGraphNode />
                        </span>
                      </td>
                      <td className="project-window__commit-comment">
                        {commit.comment}
                      </td>
                      <td>{commit.author}</td>
                      <td>{formatCommitDateTime(commit.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div
            className="project-window__center-bottom"
          >
            <TerminalPanel folderPath={folderPath} />
          </div>
        </div>

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
