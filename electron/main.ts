import { app, BrowserWindow, dialog, ipcMain, type WebContents } from 'electron'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promisify } from 'node:util'
import { spawn, type IPty } from 'node-pty'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)
const terminalSessions = new Map<
  string,
  { process: IPty; webContents: WebContents }
>()

ipcMain.handle(
  'git:getHistory',
  async (_event, repositoryPath: unknown): Promise<GitCommitInfo[]> => {
    if (typeof repositoryPath !== 'string' || repositoryPath.trim().length === 0) {
      throw new TypeError('La ruta del repositorio no es válida.')
    }

    const directory = await stat(repositoryPath)
    if (!directory.isDirectory()) {
      throw new TypeError('La ruta del repositorio no es una carpeta.')
    }

    const commandOptions = {
      cwd: repositoryPath,
      encoding: 'utf8' as const,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    }
    const [historyResult, refsResult] = await Promise.all([
      execFileAsync(
        'git',
        [
          'log',
          '--branches',
          '--remotes',
          '-z',
          '--format=%H%x00%P%x00%s%x00%an%x00%aI',
        ],
        commandOptions,
      ),
      execFileAsync(
        'git',
        [
          'for-each-ref',
          '--format=%(refname)%00%(objectname)%00%(*objectname)%00%(HEAD)%00%(symref)',
          'refs/heads',
          'refs/remotes',
          'refs/tags',
        ],
        commandOptions,
      ),
    ])

    const refsByCommit = new Map<string, GitReference[]>()
    for (const refLine of refsResult.stdout.split(/\r?\n/)) {
      const [fullName, objectHash, peeledHash, headMarker, symbolicRef] =
        refLine.split('\0')
      const commitHash = peeledHash || objectHash
      if (!fullName || !commitHash || symbolicRef) {
        continue
      }

      let ref: GitReference
      if (fullName.startsWith('refs/heads/')) {
        ref = {
          name: fullName.slice('refs/heads/'.length),
          kind: 'local',
          selected: headMarker === '*',
        }
      } else if (fullName.startsWith('refs/remotes/')) {
        const remoteRef = fullName.slice('refs/remotes/'.length)
        const separatorIndex = remoteRef.indexOf('/')
        if (separatorIndex < 1) {
          continue
        }
        ref = {
          name: remoteRef.slice(separatorIndex + 1),
          kind: 'remote',
          remote: remoteRef.slice(0, separatorIndex),
        }
      } else if (fullName.startsWith('refs/tags/')) {
        ref = {
          name: fullName.slice('refs/tags/'.length),
          kind: 'tag',
        }
      } else {
        continue
      }

      const refs = refsByCommit.get(commitHash) ?? []
      refs.push(ref)
      refsByCommit.set(commitHash, refs)
    }

    const fields = historyResult.stdout.split('\0')
    const commits: GitCommitInfo[] = []
    for (let index = 0; index + 4 < fields.length; index += 5) {
      const [hash, parentHashes, comment, author, date] = fields.slice(
        index,
        index + 5,
      )
      if (!hash || !date) {
        continue
      }

      commits.push({
        hash,
        parents: parentHashes ? parentHashes.split(' ') : [],
        branchTags: refsByCommit.get(hash) ?? [],
        comment,
        author,
        date,
      })
    }

    return commits
  },
)

function getTerminalDimensions(
  cols: unknown,
  rows: unknown,
): { cols: number; rows: number } {
  if (
    typeof cols !== 'number' ||
    !Number.isInteger(cols) ||
    cols < 1 ||
    cols > 1000 ||
    typeof rows !== 'number' ||
    !Number.isInteger(rows) ||
    rows < 1 ||
    rows > 1000
  ) {
    throw new TypeError('Las dimensiones de la terminal no son válidas.')
  }

  return { cols, rows }
}

function getOwnedTerminal(
  sender: WebContents,
  terminalId: unknown,
): { process: IPty; webContents: WebContents } {
  if (typeof terminalId !== 'string') {
    throw new TypeError('El identificador de terminal no es válido.')
  }

  const session = terminalSessions.get(terminalId)
  if (!session || session.webContents.id !== sender.id) {
    throw new Error('La terminal solicitada no existe.')
  }

  return session
}

function closeTerminalsForWindow(senderId: number): void {
  for (const [terminalId, session] of terminalSessions) {
    if (session.webContents.id === senderId) {
      terminalSessions.delete(terminalId)
      session.process.kill()
    }
  }
}

ipcMain.handle(
  'terminal:start',
  async (event, cwd: unknown, cols: unknown, rows: unknown) => {
    if (typeof cwd !== 'string' || cwd.length === 0) {
      throw new TypeError('La carpeta de trabajo no es válida.')
    }
    const dimensions = getTerminalDimensions(cols, rows)

    const directory = await stat(cwd)
    if (!directory.isDirectory()) {
      throw new TypeError('La carpeta de trabajo no existe.')
    }

    const id = randomUUID()
    const shell =
      process.platform === 'win32'
        ? process.env.POWERSHELL_EXE || 'powershell.exe'
        : process.env.SHELL || '/bin/sh'
    const shellArgs = process.platform === 'win32' ? ['-NoLogo'] : ['-i']
    const terminalProcess = spawn(shell, shellArgs, {
      name: 'xterm-256color',
      ...dimensions,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    })

    terminalSessions.set(id, { process: terminalProcess, webContents: event.sender })
    terminalProcess.onData((data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:data', id, data)
      }
    })
    terminalProcess.onExit(({ exitCode }) => {
      terminalSessions.delete(id)
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:exit', id, exitCode)
      }
    })

    return id
  },
)

ipcMain.handle('terminal:write', (event, terminalId: unknown, data: unknown) => {
  if (typeof data !== 'string') {
    throw new TypeError('Los datos de entrada de la terminal no son válidos.')
  }
  getOwnedTerminal(event.sender, terminalId).process.write(data)
})

ipcMain.handle(
  'terminal:resize',
  (event, terminalId: unknown, cols: unknown, rows: unknown) => {
    const dimensions = getTerminalDimensions(cols, rows)
    getOwnedTerminal(event.sender, terminalId).process.resize(
      dimensions.cols,
      dimensions.rows,
    )
  },
)

ipcMain.handle('terminal:close', (event, terminalId: unknown) => {
  if (typeof terminalId !== 'string') {
    throw new TypeError('El identificador de terminal no es válido.')
  }
  const session = terminalSessions.get(terminalId)
  if (!session) {
    return
  }
  if (session.webContents.id !== event.sender.id) {
    throw new Error('La terminal solicitada no existe.')
  }

  terminalSessions.delete(terminalId)
  session.process.kill()
})

ipcMain.handle('dialog:select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  return canceled ? null : filePaths[0] ?? null
})

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  const currentWindow = win
  currentWindow.on('closed', () => {
    closeTerminalsForWindow(currentWindow.webContents.id)
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
