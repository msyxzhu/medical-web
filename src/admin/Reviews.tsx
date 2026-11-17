import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminService } from './services/index.ts'
import { useAction, useWorkspace } from './workspace.tsx'
import { BackLink, PageHeading, Panel, ParticipantLink, StatusTag } from './components.tsx'
import { Button, Empty, Notice, formatDate } from '../shared/ui.tsx'
import type { Submission } from './domain.ts'

export function Reviews() {
  const { workspace } = useWorkspace()
  const [filter, setFilter] = useState('pending')
  const records = workspace.submissions.filter(record => filter === 'all' || (filter === 'done' ? record.feedback?.sentAt : !record.feedback?.sentAt))
  return <>
    <PageHeading eyebrow="PRACTICE & FEEDBACK" title="练习反馈" description="先了解具体记录，再留下有依据、可回顾的反馈。" />
    <div className="segmented" aria-label="反馈筛选">{([['pending', '待反馈'], ['done', '已反馈'], ['all', '全部记录']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}</div>
    <section className="panel"><div className="table-scroll" tabIndex={0} role="region" aria-label="练习反馈列表"><table><thead><tr><th>参与者</th><th>练习名称</th><th>提交时间</th><th>反馈状态</th><th>操作</th></tr></thead><tbody>{records.map(record => {
      const person = workspace.participants.find(item => item.id === record.participantId)
      return <tr key={record.id}><td>{person && <ParticipantLink person={person} />}</td><td>{record.title}</td><td className="muted">{formatDate(record.submittedAt)}</td><td><span className={`tag ${record.feedback?.sentAt ? '' : 'tag-warm'}`}>{record.feedback?.sentAt ? '已反馈' : record.feedback ? '草稿已保存' : '待反馈'}</span></td><td><Link className="text-link" to={`/reviews/${record.id}`}>查看练习</Link></td></tr>
    })}</tbody></table></div>{!records.length && <Empty title="此分类下没有练习记录">可切换到其他分类查看。</Empty>}</section>
  </>
}
function FeedbackEditor({ record, hold }: { record: Submission; hold: boolean }) {
  const { workspace } = useWorkspace()
  const action = useAction()
  const [body, setBody] = useState(record.feedback?.body ?? '')
  const [confirmSend, setConfirmSend] = useState(false)
  const readOnly = workspace.staff.role !== 'clinician' || Boolean(record.feedback?.sentAt)
  return <Panel title="专业反馈">
    <div className="panel-body form-stack">
      {readOnly ? <><div className="prose">{record.feedback?.body ?? '还没有反馈内容。请切换到负责治疗师身份后填写。'}</div><Notice>{record.feedback?.sentAt ? '反馈已经记录，原内容保留为只读记录。' : '项目管理可查看记录，但不能代替治疗师填写反馈。'}</Notice></>
        : <><label className="field">反馈内容<textarea maxLength={2000} rows={8} value={body} onChange={event => { setBody(event.target.value); setConfirmSend(false) }} placeholder="围绕这次记录，写下观察与下一步练习提示。" /><span className="field-hint">{body.length} / 2000 字 · 请勿填写诊断、处方或紧急处置意见。</span></label>
          <Notice tone={hold ? 'warning' : 'info'}>{hold ? '该参与者需优先获得支持或已暂停，不能提交普通练习反馈；可保留草稿。' : '反馈只保存在当前浏览器，不会发送至微信，也不表示实际联系了参与者。'}</Notice>
          {action.error && <Notice tone="error">{action.error}</Notice>}
          {confirmSend && <div className="confirm-inline"><p>确认保存为已反馈记录？提交后不再修改原内容。</p><div className="form-actions"><Button variant="ghost" onClick={() => setConfirmSend(false)} disabled={action.busy}>返回修改</Button><Button busy={action.busy} onClick={() => action.run(() => adminService.saveFeedback({ submissionId: record.id, body, send: true, revision: workspace.revision }), '反馈已记录，仅保存在本机。')}>确认记录反馈</Button></div></div>}
          {!confirmSend && <div className="form-actions"><Button variant="secondary" busy={action.busy} disabled={!body.trim()} onClick={() => action.run(() => adminService.saveFeedback({ submissionId: record.id, body, send: false, revision: workspace.revision }), '反馈草稿已保存。')}>保存草稿</Button><Button disabled={!body.trim() || hold || action.busy} onClick={() => setConfirmSend(true)}>完成反馈</Button></div>}
        </>}
    </div>
  </Panel>
}
export function ReviewDetail() {
  const { id } = useParams()
  const { workspace } = useWorkspace()
  const record = workspace.submissions.find(item => item.id === id)
  const person = workspace.participants.find(item => item.id === record?.participantId)
  if (!record || !person) return <><BackLink to="/reviews">返回练习列表</BackLink><Empty title="未找到可查看的练习" /></>
  return <>
    <BackLink to="/reviews">练习反馈</BackLink>
    <PageHeading eyebrow={`RECORD / ${record.id}`} title={record.title} description={`${person.alias} · ${person.id} · 提交于 ${formatDate(record.submittedAt)}`}><StatusTag person={person} /></PageHeading>
    <div className="detail-grid feedback-grid"><Panel title="参与者的记录"><div className="answers">{record.answers.map((answer, index) => <div key={index}><h3>{answer.label}</h3><p>{answer.value}</p></div>)}</div><div className="panel-footer"><Link to={`/participants/${person.id}`} className="text-link">查看完整参与记录 →</Link></div></Panel>
      <FeedbackEditor key={record.id} record={record} hold={person.supportHold || person.paused || person.stage === 'withdrawn'} /></div>
  </>
}
