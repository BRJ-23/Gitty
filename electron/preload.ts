import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  async selectFolder(): Promise<string | null> {
    const folder: unknown = await ipcRenderer.invoke('dialog:select-folder')
    if (folder === null || typeof folder === 'string') {
      return folder
    }

    throw new TypeError('La respuesta del selector de carpetas no es válida.')
  },
  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('projectTerminal', {
  start(cwd: string, cols: number, rows: number): Promise<string> {
    return ipcRenderer.invoke('terminal:start', cwd, cols, rows)
  },
  write(terminalId: string, data: string): Promise<void> {
    return ipcRenderer.invoke('terminal:write', terminalId, data)
  },
  resize(terminalId: string, cols: number, rows: number): Promise<void> {
    return ipcRenderer.invoke('terminal:resize', terminalId, cols, rows)
  },
  close(terminalId: string): Promise<void> {
    return ipcRenderer.invoke('terminal:close', terminalId)
  },
  onData(listener: (terminalId: string, data: string) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      terminalId: unknown,
      data: unknown,
    ) => {
      if (typeof terminalId === 'string' && typeof data === 'string') {
        listener(terminalId, data)
      }
    }
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  onExit(listener: (terminalId: string, exitCode: number) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      terminalId: unknown,
      exitCode: unknown,
    ) => {
      if (typeof terminalId === 'string' && typeof exitCode === 'number') {
        listener(terminalId, exitCode)
      }
    }
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.removeListener('terminal:exit', handler)
  },
})
