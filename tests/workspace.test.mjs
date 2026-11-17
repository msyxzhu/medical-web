import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocalWorkspace, STORAGE_KEY } from '../src/admin/services/local.ts'

class MemoryStorage {
  data = new Map()
  failWrite = false
  getItem(key) { return this.data.get(key) ?? null }
  setItem(key, value) {
    if (this.failWrite) throw new Error('Storage unavailable')
    this.data.set(key, value)
  }
  removeItem(key) { this.data.delete(key) }
}
const clock = () => '2026-11-17T04:00:00.000Z'
const isCode = code => error => error.code === code
async function setup(staff = 'manager') {
  const storage = new MemoryStorage()
  const app = createLocalWorkspace(storage, clock)
  await app.service.signIn(staff)
  return { ...app, storage }
}

test('assignment preserves baseline records and survives a reload without affecting other browser storage', async () => {
  const app = await setup()
  app.storage.setItem('another-app', 'keep')
  const before = await app.service.getWorkspace()
  const original = before.participants.find(person => person.id === 'P1001')
  await app.service.assign({ participantId: 'P1001', clinicianId: 'clinician-a', group: '第一组', revision: before.revision })
  const reopened = await createLocalWorkspace(app.storage, clock).service.getWorkspace()
  const assigned = reopened.participants.find(person => person.id === 'P1001')
  assert.equal(assigned.stage, 'learning')
  assert.equal(assigned.clinicianId, 'clinician-a')
  assert.deepEqual(assigned.assessments, original.assessments)
  assert.equal(reopened.audit[0].action, '安排学习')
  assert.equal(app.storage.getItem('another-app'), 'keep')
})

test('roles filter participants and reject out-of-scope writes, including direct service calls', async () => {
  const { service } = await setup('clinician-b')
  const workspace = await service.getWorkspace()
  assert.ok(workspace.participants.every(person => person.clinicianId === 'clinician-b'))
  await assert.rejects(service.assign({ participantId: 'P1001', clinicianId: 'clinician-b', group: '组', revision: workspace.revision }), isCode('FORBIDDEN'))
  await assert.rejects(service.saveFeedback({ submissionId: 'W1001', body: '一条反馈', send: true, revision: workspace.revision }), isCode('NOT_FOUND'))
  await assert.rejects(service.exportSummary(workspace.revision), isCode('FORBIDDEN'))
})

test('feedback drafts persist and submitted feedback becomes read-only with one local message', async () => {
  const app = await setup('clinician-a')
  let workspace = await app.service.getWorkspace()
  await app.service.saveFeedback({ submissionId: 'W1001', body: '可以回看你记录的小步骤。', send: false, revision: workspace.revision })
  workspace = await createLocalWorkspace(app.storage, clock).service.getWorkspace()
  assert.equal(workspace.submissions[0].feedback.sentAt, null)
  assert.equal(workspace.messages.length, 0)
  await app.service.saveFeedback({ submissionId: 'W1001', body: workspace.submissions[0].feedback.body, send: true, revision: workspace.revision })
  workspace = await app.service.getWorkspace()
  assert.ok(workspace.submissions[0].feedback.sentAt)
  assert.equal(workspace.messages.length, 1)
  await assert.rejects(app.service.saveFeedback({ submissionId: 'W1001', body: '重复反馈', send: true, revision: workspace.revision }), isCode('READ_ONLY'))
})

test('support notes are traceable and neither referral nor ordinary resume removes a support hold', async () => {
  const { service } = await setup('clinician-a')
  let workspace = await service.getWorkspace()
  await service.recordSupport({ caseId: 'R1001', body: '记录已建议寻求线下专业支持，等待进一步确认。', outcome: 'referred', revision: workspace.revision })
  workspace = await service.getWorkspace()
  assert.equal(workspace.supportCases[0].state, 'referred')
  assert.equal(workspace.supportCases[0].notes.length, 1)
  assert.equal(workspace.participants.find(person => person.id === 'P1008').supportHold, true)
  await assert.rejects(service.setPaused('P1008', false, workspace.revision), isCode('STAGE'))
})

test('content keeps its published copy until an independent review and a new publication succeed', async () => {
  const { service } = await setup()
  let workspace = await service.getWorkspace()
  const lesson = workspace.lessons[0]
  const copy = { ...lesson.draft, goal: '修改后的课程目标' }
  await service.saveContent({ lessonId: lesson.id, copy, revision: workspace.revision })
  workspace = await service.getWorkspace()
  assert.deepEqual(workspace.lessons[0].published, lesson.published)
  await assert.rejects(service.publishContent(lesson.id, workspace.revision), isCode('REVIEW_REQUIRED'))
  await service.submitContent(lesson.id, workspace.revision)
  await service.signIn('clinician-a')
  workspace = await service.getWorkspace()
  await service.reviewContent({ lessonId: lesson.id, approve: true, note: '已核对本机示例的结构与文字。', revision: workspace.revision })
  await service.signIn('manager')
  workspace = await service.getWorkspace()
  await service.publishContent(lesson.id, workspace.revision)
  workspace = await service.getWorkspace()
  assert.equal(workspace.lessons[0].version, 2)
  assert.deepEqual(workspace.lessons[0].published, copy)
})

test('conflicts and storage failures do not report success or partially mutate data and logs', async () => {
  const { service, storage } = await setup()
  const workspace = await service.getWorkspace()
  await service.setPaused('P1002', true, workspace.revision)
  const saved = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.setPaused('P1002', false, workspace.revision), isCode('CONFLICT'))
  assert.equal(storage.getItem(STORAGE_KEY), saved)
  storage.failWrite = true
  const updated = await service.getWorkspace()
  await assert.rejects(service.setPaused('P1002', false, updated.revision), isCode('STORAGE_WRITE'))
  assert.equal(storage.getItem(STORAGE_KEY), saved)
})

test('explicit reset recovers malformed state without clearing unrelated keys', async () => {
  const { service, storage, tools } = await setup()
  storage.setItem('other', 'retained')
  storage.setItem(STORAGE_KEY, '{broken')
  await assert.rejects(service.getSession(), isCode('INVALID_STORE'))
  await tools.reset()
  assert.equal(await service.getSession(), null)
  await service.signIn('manager')
  assert.equal((await service.getWorkspace()).participants.length, 8)
  assert.equal(storage.getItem('other'), 'retained')
})

test('export contains only identifiers and aggregate progress, with an operation log', async () => {
  const { service } = await setup()
  const workspace = await service.getWorkspace()
  const csv = await service.exportSummary(workspace.revision)
  assert.match(csv, /P1001/)
  assert.match(csv, /"P1003","已暂停"/)
  assert.match(csv, /"P1008","优先支持"/)
  assert.doesNotMatch(csv, /小禾|疲惫|反馈|开始前记录/)
  assert.equal(csv.trim().split('\r\n').length, 9)
  assert.equal((await service.getWorkspace()).audit[0].action, '导出参与概览')
})
