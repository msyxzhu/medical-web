import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { STAFF, STAGE_LABELS, staffName, statusOf } from './domain.ts'
import type { Participant, StaffId } from './domain.ts'
import { adminService } from './services/index.ts'
import { useAction, useWorkspace } from './workspace.tsx'
import { BackLink, PageHeading, Panel, ParticipantLink, StatusTag } from './components.tsx'
import { Button, Empty, Icon, Modal, Notice, formatDate } from '../shared/ui.tsx'

export function Participants() {
  const { workspace } = useWorkspace()
  const [search, setSearch] = useState('')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'all'
  const people = workspace.participants.filter(person =>
    (status === 'all' || statusOf(person) === status) &&
    `${person.alias} ${person.id}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <>
    <PageHeading eyebrow="PARTICIPANTS" title="参与者管理" description="查看当前进度，为已完成评估的参与者安排下一步。" />
    <section className="panel">
      <div className="toolbar"><label className="search-field"><Icon name="search" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索称呼或编号" aria-label="搜索参与者" /></label>
        <label className="select-field">参与状态<select value={status} onChange={event => setParams(event.target.value === 'all' ? {} : { status: event.target.value })}><option value="all">全部状态</option>{Object.entries(STAGE_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <span className="muted small">共 {people.length} 位</span>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="参与者列表"><table><thead><tr><th>参与者</th><th>参与状态</th><th>课程进度</th><th>负责人员</th><th>分组</th><th>操作</th></tr></thead><tbody>
        {people.map(person => <tr key={person.id}><td><ParticipantLink person={person} /></td><td><StatusTag person={person} /></td><td>{person.completedLessons} / 10 课</td><td>{staffName(person.clinicianId)}</td><td className="muted">{person.group ?? '等待安排'}</td><td><Link className="text-link" to={`/participants/${person.id}`}>{statusOf(person) === 'waiting' ? '安排学习' : '查看详情'}</Link></td></tr>)}
      </tbody></table></div>
      {!people.length && <Empty title="没有符合条件的参与者">试试其他称呼、编号或状态。</Empty>}
    </section>
  </>
}
function Assignment({ person, onClose }: { person: Participant; onClose: () => void }) {
  const { workspace } = useWorkspace()
  const action = useAction()
  const [group, setGroup] = useState('情绪与行动 · 第一组')
  const [clinician, setClinician] = useState<StaffId>('clinician-a')
  return <Modal title={`为${person.alias}安排学习`} onClose={onClose} busy={action.busy}>
    <form onSubmit={async event => { event.preventDefault(); if (await action.run(() => adminService.assign({ participantId: person.id, clinicianId: clinician, group, revision: workspace.revision }), '课程安排已保存在本机。')) onClose() }}>
      <div className="form-stack">
        <div className="selection-summary"><Icon name="book" /><div><strong>情绪与行动练习</strong><p>抑郁主题 · 10 课目录 · 当前前两课可用</p></div></div>
        <label className="field">负责治疗师<select value={clinician} onChange={event => { const selected = STAFF.find(staff => staff.id === event.target.value && staff.role === 'clinician'); if (selected) setClinician(selected.id) }}>{STAFF.filter(staff => staff.role === 'clinician').map(staff => <option value={staff.id} key={staff.id}>{staff.name}</option>)}</select></label>
        <label className="field">分组名称<input required maxLength={40} value={group} onChange={event => setGroup(event.target.value)} /></label>
        <Notice>保留已有评估和记录。此操作仅改变当前浏览器的工作记录，不会自动开通微信端课程。</Notice>
        {action.error && <Notice tone="error">{action.error}</Notice>}
      </div><div className="form-actions"><Button variant="ghost" onClick={onClose} disabled={action.busy}>取消</Button><Button type="submit" busy={action.busy}>确认安排</Button></div>
    </form>
  </Modal>
}
export function ParticipantDetail() {
  const { id } = useParams()
  const { workspace } = useWorkspace()
  const action = useAction()
  const [assigning, setAssigning] = useState(false)
  const [changing, setChanging] = useState(false)
  const person = workspace.participants.find(item => item.id === id)
  if (!person) return <><BackLink to="/participants">返回参与者</BackLink><Empty title="未找到可查看的参与者">当前身份可能没有访问这条记录的权限。</Empty></>
  const records = workspace.submissions.filter(record => record.participantId === person.id)
  const support = workspace.supportCases.find(item => item.participantId === person.id)
  const mutable = !person.supportHold && !['completed', 'withdrawn'].includes(person.stage)
  return <>
    <BackLink to="/participants">参与者管理</BackLink>
    <PageHeading eyebrow={`PARTICIPANT / ${person.id}`} title={`${person.alias}的学习记录`} description={`${person.ageBand} · ${person.consentVersion}`}>
      <StatusTag person={person} />
      {workspace.staff.role === 'manager' && statusOf(person) === 'waiting' && <Button onClick={() => setAssigning(true)}>安排学习</Button>}
      {mutable && <Button variant="secondary" onClick={() => setChanging(true)}>{person.paused ? '继续参与' : '暂停参与'}</Button>}
    </PageHeading>
    {person.supportHold && <Notice tone="warning">常规学习已暂缓。请优先查看人工复核记录；不根据量表总分自动解除限制。{support && <Link className="inline-link" to={`/support/${support.id}`}>查看复核事项 →</Link>}</Notice>}
    <div className="detail-grid">
      <div className="stack">
        <Panel title="评估记录"><p className="section-note">仅呈现条目合计，不提供严重程度分层、诊断或疗效判断。</p>
          {person.assessments.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="评估记录"><table><thead><tr><th>记录阶段</th><th>PHQ-9 / 27</th><th>GAD-7 / 21</th><th>时间</th></tr></thead><tbody>{person.assessments.map(record => <tr key={record.id}><td>{record.label}{record.attention && <span className="assessment-note">需优先关注</span>}</td><td>{record.phq}</td><td>{record.gad}</td><td className="muted">{formatDate(record.at)}</td></tr>)}</tbody></table></div> : <Empty title="尚未完成开始前评估" />}
        </Panel>
        <Panel title="练习与反馈">{records.length ? records.map(record => <Link key={record.id} className="record-link" to={`/reviews/${record.id}`}><span className="task-icon"><Icon name="log" /></span><div><strong>{record.title}</strong><p>{formatDate(record.submittedAt)} · {record.feedback?.sentAt ? '已反馈' : record.feedback ? '反馈草稿' : '待反馈'}</p></div><Icon name="chevron" size={16} /></Link>) : <Empty title="还没有提交练习">后续记录会显示在这里。</Empty>}</Panel>
      </div>
      <Panel title="学习安排"><dl className="info-list"><div><dt>负责人员</dt><dd>{staffName(person.clinicianId)}</dd></div><div><dt>分组</dt><dd>{person.group ?? '等待安排'}</dd></div><div><dt>项目</dt><dd>情绪与行动练习</dd></div><div><dt>课程进度</dt><dd>{person.completedLessons} / 10 课</dd></div><div><dt>参与时间</dt><dd>{formatDate(person.joinedAt)}</dd></div></dl><div className="progress-track progress-large"><span style={{ width: `${person.completedLessons * 10}%` }} /></div><p className="section-note">暂停不会清除学习记录。十课完成的预置记录用于查看复测流程，不等于真实完成疗程。</p></Panel>
    </div>
    {assigning && <Assignment person={person} onClose={() => setAssigning(false)} />}
    {changing && <Modal title={person.paused ? '继续当前参与？' : '暂停当前参与？'} busy={action.busy} onClose={() => setChanging(false)}><p className="muted">会保留已有的评估、练习和课程进度，不会向微信发送通知。</p>{action.error && <Notice tone="error">{action.error}</Notice>}<div className="form-actions"><Button variant="ghost" disabled={action.busy} onClick={() => setChanging(false)}>取消</Button><Button busy={action.busy} onClick={async () => { if (await action.run(() => adminService.setPaused(person.id, !person.paused, workspace.revision), '参与状态已更新。')) setChanging(false) }}>确认{person.paused ? '继续' : '暂停'}</Button></div></Modal>}
  </>
}
