/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface GitCommitInfo {
  hash: string
  parents: string[]
  branchTags: GitReference[]
  comment: string
  author: string
  date: string
}

type GitReference =
  | { name: string; kind: 'local'; selected: boolean }
  | { name: string; kind: 'tag' }
  | { name: string; kind: 'remote'; remote: string }

interface Window {
  ipcRenderer: import('electron').IpcRenderer & {
    selectFolder: () => Promise<string | null>
    getGitHistory: (repositoryPath: string) => Promise<GitCommitInfo[]>
  }
  projectTerminal: {
    start: (cwd: string, cols: number, rows: number) => Promise<string>
    write: (terminalId: string, data: string) => Promise<void>
    resize: (terminalId: string, cols: number, rows: number) => Promise<void>
    close: (terminalId: string) => Promise<void>
    onData: (listener: (terminalId: string, data: string) => void) => () => void
    onExit: (
      listener: (terminalId: string, exitCode: number) => void,
    ) => () => void
  }
}
