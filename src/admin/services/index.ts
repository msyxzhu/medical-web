import { createLocalWorkspace, STORAGE_KEY } from './local.ts'
import type { StoragePort } from './contracts.ts'

const browserStorage: StoragePort = {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => localStorage.removeItem(key),
}
const local = createLocalWorkspace(browserStorage)
export const adminService = local.service
export const localTools = local.tools
export const capabilities = { localWorkspace: true }

export function watchWorkspaceStorage(onChange: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && (event.key === STORAGE_KEY || event.key === null)) onChange()
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
