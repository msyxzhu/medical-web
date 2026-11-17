import type { ContentCopy, Staff, StaffId, Workspace } from '../domain.ts'

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export interface AdminService {
  getSession(): Promise<Staff | null>
  signIn(staffId: StaffId): Promise<void>
  signOut(): Promise<void>
  getWorkspace(): Promise<Workspace>
  assign(input: { participantId: string; clinicianId: StaffId; group: string; revision: number }): Promise<void>
  setPaused(participantId: string, paused: boolean, revision: number): Promise<void>
  saveFeedback(input: { submissionId: string; body: string; send: boolean; revision: number }): Promise<void>
  recordSupport(input: { caseId: string; body: string; outcome: 'reviewing' | 'referred'; revision: number }): Promise<void>
  saveContent(input: { lessonId: string; copy: ContentCopy; revision: number }): Promise<void>
  submitContent(lessonId: string, revision: number): Promise<void>
  reviewContent(input: { lessonId: string; approve: boolean; note: string; revision: number }): Promise<void>
  publishContent(lessonId: string, revision: number): Promise<void>
  exportSummary(revision: number): Promise<string>
}
export interface LocalWorkspaceTools {
  reset(): Promise<void>
}
