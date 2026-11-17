import { createLocalWorkspace } from './local.ts'
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
