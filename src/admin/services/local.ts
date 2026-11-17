import { databaseSchema, STAFF, STAGE_LABELS, staffIdSchema, statusOf } from '../domain.ts'
import type { Database, Participant, Staff } from '../domain.ts'
import type { AdminService, LocalWorkspaceTools, StoragePort } from './contracts.ts'
import { createSeed } from './seed.ts'

export const STORAGE_KEY = 'medical:web:workspace:v1'
export class AppError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}
function required(text: string, label: string, max = 2000): string {
  const value = text.trim()
  if (!value || value.length > max) throw new AppError('VALIDATION', `请填写${label}，最多 ${max} 字。`)
  return value
}
function csvCell(value: string | number): string {
  const text = String(value)
  return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`
}

export function createLocalWorkspace(storage: StoragePort, clock = () => new Date().toISOString()):
{ service: AdminService; tools: LocalWorkspaceTools } {
  function read(): Database {
    let raw: string | null
    try { raw = storage.getItem(STORAGE_KEY) } catch {
      throw new AppError('STORAGE_READ', '无法读取本机工作记录，请检查浏览器存储权限后重试。')
    }
    if (raw === null) return createSeed(clock())
    let value: unknown
    try { value = JSON.parse(raw) } catch {
      throw new AppError('INVALID_STORE', '本机记录损坏，不能继续读取。可通过“重置本机工作区”恢复预置记录。')
    }
    const result = databaseSchema.safeParse(value)
    if (!result.success) throw new AppError('INVALID_STORE', '本机记录格式不兼容，请重置本机工作区，不会清理其他网站数据。')
    return result.data
  }
  function write(db: Database): void {
    const valid = databaseSchema.safeParse(db)
    if (!valid.success) throw new AppError('INVALID_DATA', '记录校验失败，本次修改未保存。')
    try { storage.setItem(STORAGE_KEY, JSON.stringify(valid.data)) } catch {
      throw new AppError('STORAGE_WRITE', '保存失败，请检查浏览器存储空间。当前修改尚未保存。')
    }
  }
  function actor(db: Database): Staff {
    const staff = STAFF.find(item => item.id === db.staffId)
    if (!staff) throw new AppError('SIGN_IN', '请先选择工作身份。')
    return staff
  }
  function manager(staff: Staff): void {
    if (staff.role !== 'manager') throw new AppError('FORBIDDEN', '此操作需要项目管理身份。')
  }
  function clinician(staff: Staff): asserts staff is Extract<Staff, { role: 'clinician' }> {
    if (staff.role !== 'clinician') throw new AppError('FORBIDDEN', '此操作需要治疗师身份。')
  }
  function personFor(db: Database, id: string, staff: Staff): Participant {
    const person = db.participants.find(item => item.id === id)
    if (!person || (staff.role === 'clinician' && person.clinicianId !== staff.id)) {
      throw new AppError('NOT_FOUND', '未找到当前身份可查看的参与者。')
    }
    return person
  }
  function canStudy(person: Participant): void {
    if (person.supportHold) throw new AppError('SUPPORT_HOLD', '该参与者需优先获得专业支持，不能开放常规学习或发送普通练习反馈。')
    if (person.paused || person.stage === 'withdrawn') throw new AppError('PAUSED', '参与已暂停或退出，请先确认参与状态。')
  }
  function change(revision: number, operation: (db: Database, staff: Staff) => { action: string; target: string; detail: string }): void {
    const db = read()
    const staff = actor(db)
    if (db.revision !== revision) throw new AppError('CONFLICT', '记录已被其他操作更新，请刷新后核对。尚未保存的输入仍保留在页面。')
    const event = operation(db, staff)
    db.sequence++
    db.revision++
    db.audit.unshift({ ...event, id: `log-${db.sequence}`, actorId: staff.id, at: clock() })
    write(db)
  }
  function lessonFor(db: Database, id: string) {
    const lesson = db.lessons.find(item => item.id === id)
    if (!lesson) throw new AppError('NOT_FOUND', '未找到课程。')
    return lesson
  }
  const service: AdminService = {
    async getSession() {
      const db = read()
      return db.staffId === null ? null : actor(db)
    },
    async signIn(id) {
      if (!staffIdSchema.safeParse(id).success) throw new AppError('VALIDATION', '请选择有效的工作身份。')
      const db = read()
      db.staffId = id
      db.revision++
      write(db)
    },
    async signOut() {
      const db = read()
      db.staffId = null
      db.revision++
      write(db)
    },
    async getWorkspace() {
      const db = read()
      const staff = actor(db)
      const participants = db.participants.filter(person => staff.role === 'manager' || person.clinicianId === staff.id)
      const ids = new Set(participants.map(person => person.id))
      return {
        staff, revision: db.revision, participants, lessons: db.lessons,
        submissions: db.submissions.filter(record => ids.has(record.participantId)),
        supportCases: db.supportCases.filter(record => ids.has(record.participantId)),
        messages: db.messages.filter(record => ids.has(record.participantId)),
        audit: db.audit.filter(record => staff.role === 'manager' || record.actorId === staff.id),
      }
    },
    async assign(input) {
      change(input.revision, (db, staff) => {
        manager(staff)
        const person = personFor(db, input.participantId, staff)
        canStudy(person)
        if (person.stage !== 'waiting' || person.assessments.length === 0) throw new AppError('STAGE', '只有已完成开始前评估、正在等待安排的参与者可以分组。')
        const selected = STAFF.find(item => item.id === input.clinicianId && item.role === 'clinician')
        if (!selected || selected.role !== 'clinician') throw new AppError('VALIDATION', '请选择负责治疗师。')
        person.group = required(input.group, '分组名称', 40)
        person.clinicianId = selected.id
        person.stage = 'learning'
        return { action: '安排学习', target: person.id, detail: `${person.group} · ${selected.name}` }
      })
    },
    async setPaused(id, paused, revision) {
      change(revision, (db, staff) => {
        const person = personFor(db, id, staff)
        if (person.supportHold || person.stage === 'withdrawn' || person.stage === 'completed') {
          throw new AppError('STAGE', '当前状态不能通过普通暂停或继续操作改变。')
        }
        person.paused = paused
        return { action: paused ? '暂停参与' : '恢复参与', target: id, detail: '原学习进度与记录保留' }
      })
    },
    async saveFeedback(input) {
      change(input.revision, (db, staff) => {
        clinician(staff)
        const record = db.submissions.find(item => item.id === input.submissionId)
        if (!record) throw new AppError('NOT_FOUND', '练习记录不存在。')
        const person = personFor(db, record.participantId, staff)
        if (record.feedback?.sentAt) throw new AppError('READ_ONLY', '已反馈的内容只读，不会覆盖历史反馈。')
        if (input.send) canStudy(person)
        const body = required(input.body, '反馈内容')
        record.feedback = { body, authorId: staff.id, savedAt: clock(), sentAt: input.send ? clock() : null }
        if (input.send) {
          db.sequence++
          db.messages.push({ id: `message-${db.sequence}`, participantId: person.id, submissionId: record.id, body, authorId: staff.id, createdAt: clock() })
        }
        return { action: input.send ? '记录练习反馈' : '保存反馈草稿', target: record.id, detail: '仅保存在本机，不发送微信消息' }
      })
    },
    async recordSupport(input) {
      change(input.revision, (db, staff) => {
        clinician(staff)
        const item = db.supportCases.find(value => value.id === input.caseId)
        if (!item) throw new AppError('NOT_FOUND', '复核事项不存在。')
        personFor(db, item.participantId, staff)
        if (!['reviewing', 'referred'].includes(input.outcome)) throw new AppError('VALIDATION', '请选择有效的记录去向。')
        item.notes.push({ at: clock(), authorId: staff.id, body: required(input.body, '复核记录'), outcome: input.outcome })
        item.state = input.outcome
        return { action: '记录人工复核', target: item.id, detail: input.outcome === 'referred' ? '记录转介去向；常规学习仍暂缓' : '继续跟进；常规学习仍暂缓' }
      })
    },
    async saveContent(input) {
      change(input.revision, (db, staff) => {
        manager(staff)
        const lesson = lessonFor(db, input.lessonId)
        lesson.draft = {
          title: required(input.copy.title, '课程名称', 60),
          goal: required(input.copy.goal, '课程目标', 200),
          body: required(input.copy.body, '课程内容', 12000),
        }
        lesson.stage = 'draft'
        lesson.editedBy = staff.id
        lesson.reviewedBy = null
        lesson.reviewNote = ''
        lesson.updatedAt = clock()
        return { action: '保存课程草稿', target: lesson.id, detail: '已发布版本保持不变，需重新审核' }
      })
    },
    async submitContent(id, revision) {
      change(revision, (db, staff) => {
        manager(staff)
        const lesson = lessonFor(db, id)
        if (lesson.stage !== 'draft') throw new AppError('STAGE', '只有草稿可以提交审核。')
        required(lesson.draft.body, '课程内容', 12000)
        lesson.stage = 'reviewing'
        lesson.editedBy = staff.id
        lesson.updatedAt = clock()
        return { action: '提交课程审核', target: id, detail: '等待治疗师审核；尚未发布' }
      })
    },
    async reviewContent(input) {
      change(input.revision, (db, staff) => {
        clinician(staff)
        const lesson = lessonFor(db, input.lessonId)
        if (lesson.stage !== 'reviewing' || lesson.editedBy === staff.id) throw new AppError('STAGE', '当前内容不允许由此身份审核。')
        lesson.reviewNote = required(input.note, '审核意见', 1000)
        lesson.reviewedBy = input.approve ? staff.id : null
        lesson.stage = input.approve ? 'approved' : 'draft'
        lesson.updatedAt = clock()
        return { action: input.approve ? '审核课程通过' : '退回课程修改', target: lesson.id, detail: '本机审核流程记录' }
      })
    },
    async publishContent(id, revision) {
      change(revision, (db, staff) => {
        manager(staff)
        const lesson = lessonFor(db, id)
        if (lesson.stage !== 'approved' || !lesson.reviewedBy) throw new AppError('REVIEW_REQUIRED', '课程须经治疗师审核通过后才能发布。')
        lesson.published = { ...lesson.draft }
        lesson.version++
        lesson.stage = 'published'
        lesson.updatedAt = clock()
        return { action: '发布课程版本', target: id, detail: `本机版本 v${lesson.version}；尚未同步官网或微信` }
      })
    },
    async exportSummary(revision) {
      let output = ''
      change(revision, (db, staff) => {
        manager(staff)
        const rows: Array<Array<string | number>> = [['参与者编号', '阶段', '已学课数', '评估次数', '需复核']]
        rows.push(...db.participants.map(person => [person.id, STAGE_LABELS[statusOf(person)], person.completedLessons, person.assessments.length, person.supportHold ? '是' : '否']))
        output = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
        return { action: '导出参与概览', target: 'workspace', detail: '仅编号与进度，不含称呼、答卷或自由文本' }
      })
      return output
    },
  }
  const tools: LocalWorkspaceTools = {
    async reset() {
      let revision = 0
      let sequence = 100
      try {
        const previous = read()
        revision = previous.revision
        sequence = previous.sequence
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'INVALID_STORE') throw error
        console.warn('[workspace.reset]', error.code)
      }
      const fresh = createSeed(clock())
      fresh.revision = revision + 1
      fresh.sequence = sequence
      write(fresh)
    },
  }
  return { service, tools }
}
