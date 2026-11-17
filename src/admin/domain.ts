import { z } from 'zod'

export const STAFF = [
  { id: 'manager', name: '项目管理', role: 'manager' },
  { id: 'clinician-a', name: '治疗师 A', role: 'clinician' },
  { id: 'clinician-b', name: '治疗师 B', role: 'clinician' },
] as const
export type StaffId = typeof STAFF[number]['id']
export type Staff = typeof STAFF[number]
export const staffIdSchema = z.enum(['manager', 'clinician-a', 'clinician-b'])
const clinicianIdSchema = z.enum(['clinician-a', 'clinician-b'])
const date = z.string().datetime()
const stageSchema = z.enum(['baseline', 'waiting', 'learning', 'post', 'completed', 'withdrawn'])
export const STAGE_LABELS = {
  baseline: '待评估', waiting: '待分组', learning: '学习中', post: '待复测',
  completed: '已完成', withdrawn: '已退出', paused: '已暂停', support: '优先支持',
}
export type Status = keyof typeof STAGE_LABELS
const assessmentSchema = z.object({
  id: z.string(), label: z.string(), at: date,
  phq: z.number().int().min(0).max(27), gad: z.number().int().min(0).max(21),
  attention: z.boolean(),
})
export const participantSchema = z.object({
  id: z.string(), alias: z.string(), ageBand: z.string(), joinedAt: date,
  stage: stageSchema, paused: z.boolean(), supportHold: z.boolean(),
  clinicianId: clinicianIdSchema.nullable(), group: z.string().nullable(),
  consentVersion: z.string(), completedLessons: z.number().int().min(0).max(10),
  assessments: z.array(assessmentSchema),
})
export type Participant = z.infer<typeof participantSchema>
const feedbackSchema = z.object({
  body: z.string(), authorId: clinicianIdSchema, savedAt: date, sentAt: date.nullable(),
})
export const submissionSchema = z.object({
  id: z.string(), participantId: z.string(), title: z.string(), submittedAt: date,
  answers: z.array(z.object({ label: z.string(), value: z.string() })),
  feedback: feedbackSchema.nullable(),
})
export type Submission = z.infer<typeof submissionSchema>
const supportNoteSchema = z.object({
  at: date, authorId: clinicianIdSchema, body: z.string(), outcome: z.enum(['reviewing', 'referred']),
})
export const supportCaseSchema = z.object({
  id: z.string(), participantId: z.string(), createdAt: date, reason: z.string(),
  state: z.enum(['open', 'reviewing', 'referred']), notes: z.array(supportNoteSchema),
})
export type SupportCase = z.infer<typeof supportCaseSchema>
const copySchema = z.object({ title: z.string(), goal: z.string(), body: z.string() })
export type ContentCopy = z.infer<typeof copySchema>
export const lessonSchema = z.object({
  id: z.string(), order: z.number().int(), draft: copySchema, published: copySchema.nullable(),
  stage: z.enum(['draft', 'reviewing', 'approved', 'published']), version: z.number().int().min(0),
  editedBy: staffIdSchema.nullable(), reviewedBy: clinicianIdSchema.nullable(),
  reviewNote: z.string(), updatedAt: date,
})
export type ManagedLesson = z.infer<typeof lessonSchema>
export const CONTENT_LABELS = { draft: '草稿', reviewing: '待审核', approved: '审核通过', published: '已发布' }
const messageSchema = z.object({
  id: z.string(), participantId: z.string(), submissionId: z.string(),
  body: z.string(), authorId: clinicianIdSchema, createdAt: date,
})
const auditSchema = z.object({
  id: z.string(), at: date, actorId: staffIdSchema, action: z.string(), target: z.string(), detail: z.string(),
})
export const databaseSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().min(0), sequence: z.number().int().min(0),
  staffId: staffIdSchema.nullable(), participants: z.array(participantSchema),
  submissions: z.array(submissionSchema), supportCases: z.array(supportCaseSchema),
  lessons: z.array(lessonSchema), messages: z.array(messageSchema), audit: z.array(auditSchema),
}).superRefine((db, context) => {
  const people = new Set(db.participants.map(person => person.id))
  const recordIds = new Set(db.submissions.map(record => record.id))
  for (const list of [db.participants, db.submissions, db.supportCases, db.lessons, db.messages, db.audit]) {
    if (new Set(list.map(item => item.id)).size !== list.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate record identifiers' })
    }
  }
  if ([...db.submissions, ...db.supportCases, ...db.messages].some(item => !people.has(item.participantId)) ||
    db.messages.some(message => !recordIds.has(message.submissionId))) {
    context.addIssue({ code: 'custom', message: 'Invalid record relationships' })
  }
})
export type Database = z.infer<typeof databaseSchema>
export type Workspace = Omit<Database, 'schemaVersion' | 'sequence' | 'staffId'> & { staff: Staff }

export function statusOf(person: Participant): Status {
  return person.supportHold ? 'support' : person.stage === 'withdrawn' ? 'withdrawn' : person.paused ? 'paused' : person.stage
}
export function staffName(id: StaffId | null): string {
  return STAFF.find(staff => staff.id === id)?.name ?? '尚未分配'
}
