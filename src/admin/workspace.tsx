import { createContext, useContext, useState } from 'react'
import type { Workspace } from './domain.ts'
import { AppError } from './services/local.ts'

export function errorMessage(error: unknown): string {
  console.error('[workspace]', error instanceof AppError ? error.code : error)
  return error instanceof AppError ? error.message : '操作未完成，请重试。已保存的记录不会被自动清理。'
}
export const WorkspaceContext = createContext<{
  workspace: Workspace
  reload: () => Promise<void>
  notify: (message: string) => void
} | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('Workspace provider is missing')
  return context
}

// Keep only local edits in state. An untouched editor follows the saved record on refresh.
export function useRecordDraft<T>(saved: T, recordStamp: string) {
  const [edit, setEdit] = useState<{ stamp: string; value: T } | null>(null)
  return {
    value: edit ? edit.value : saved,
    conflict: edit !== null && edit.stamp !== recordStamp && JSON.stringify(edit.value) !== JSON.stringify(saved),
    update(value: T) {
      setEdit(previous => JSON.stringify(value) === JSON.stringify(saved) ? null : { stamp: previous?.stamp ?? recordStamp, value })
    },
    discard() { setEdit(null) },
  }
}
export function useAction() {
  const { reload, notify } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(operation: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      await operation()
      await reload()
      notify(message)
      return true
    } catch (problem) {
      setError(errorMessage(problem))
      return false
    } finally { setBusy(false) }
  }
  return { busy, error, run }
}
