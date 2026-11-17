import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SUPPORT_TEXT } from '../shared/content.ts'
import { Button, Empty, Notice, formatDate } from '../shared/ui.tsx'
import { staffName } from './domain.ts'
import { adminService } from './services/index.ts'
import { useAction, useWorkspace } from './workspace.tsx'
import { BackLink, PageHeading, Panel, ParticipantLink } from './components.tsx'

const LABELS = { open: '待复核', reviewing: '跟进中', referred: '已记录转介' }
export function SupportQueue() {
  const { workspace } = useWorkspace()
  return <>
    <PageHeading eyebrow="PRIORITY SUPPORT" title="人工复核" description="把需要额外支持的记录单独跟进，不让常规课程流程代替人工判断。" />
    <Notice tone="warning">此处没有实时值守或自动报警。记录复核或转介，不会自动解除学习限制。{SUPPORT_TEXT}</Notice>
    <section className="panel spaced"><div className="table-scroll" tabIndex={0} role="region" aria-label="人工复核列表"><table><thead><tr><th>参与者</th><th>关注事项</th><th>创建时间</th><th>记录状态</th><th>操作</th></tr></thead><tbody>{workspace.supportCases.map(item => {
      const person = workspace.participants.find(value => value.id === item.participantId)
      return <tr key={item.id}><td>{person && <ParticipantLink person={person} />}</td><td className="table-copy">{item.reason}</td><td className="muted">{formatDate(item.createdAt)}</td><td><span className="tag tag-alert">{LABELS[item.state]}</span></td><td><Link className="text-link" to={`/support/${item.id}`}>查看与记录</Link></td></tr>
    })}</tbody></table></div>{!workspace.supportCases.length && <Empty title="当前没有待查看的复核记录">这不表示已经完成临床风险评估。</Empty>}</section>
  </>
}
export function SupportDetail() {
  const { id } = useParams()
  const { workspace } = useWorkspace()
  const action = useAction()
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState<'reviewing' | 'referred'>('reviewing')
  const item = workspace.supportCases.find(value => value.id === id)
  const person = workspace.participants.find(value => value.id === item?.participantId)
  if (!item || !person) return <><BackLink to="/support">返回人工复核</BackLink><Empty title="未找到可查看的事项" /></>
  return <>
    <BackLink to="/support">人工复核</BackLink>
    <PageHeading eyebrow={`SUPPORT / ${item.id}`} title={`${person.alias}的复核记录`} description={item.reason}><span className="tag tag-alert">{LABELS[item.state]}</span></PageHeading>
    <Notice tone="warning">学习仍处于暂缓状态。本页只记录人工跟进过程，不构成真实联络、风险解除或临床决定。</Notice>
    <div className="detail-grid spaced"><Panel title="跟进时间线"><ol className="timeline"><li><i /><div><strong>事项进入复核队列</strong><small>{formatDate(item.createdAt)}</small><p>{item.reason}</p></div></li>{item.notes.map((note, index) => <li key={index}><i /><div><strong>{note.outcome === 'referred' ? '已记录转介去向' : '继续跟进'} · {staffName(note.authorId)}</strong><small>{formatDate(note.at)}</small><p>{note.body}</p></div></li>)}</ol><div className="panel-footer"><Link to={`/participants/${person.id}`} className="text-link">回看参与者资料 →</Link></div></Panel>
      <Panel title="补充跟进记录"><div className="panel-body">{workspace.staff.role !== 'clinician' ? <Notice>请切换到负责治疗师身份记录复核过程。项目管理不能代替专业人员作出判断。</Notice> : <form className="form-stack" onSubmit={async event => { event.preventDefault(); if (await action.run(() => adminService.recordSupport({ caseId: item.id, body, outcome, revision: workspace.revision }), '跟进记录已保存，学习限制保持不变。')) setBody('') }}>
        <label className="field">记录去向<select value={outcome} onChange={event => setOutcome(event.target.value === 'referred' ? 'referred' : 'reviewing')}><option value="reviewing">继续跟进</option><option value="referred">已记录线下转介</option></select></label>
        <label className="field">过程与后续安排<textarea required rows={6} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} placeholder="仅使用虚构信息，记录观察、已确认的过程与后续跟进事项。" /></label>
        {action.error && <Notice tone="error">{action.error}</Notice>}
        <Button type="submit" busy={action.busy} disabled={!body.trim()}>保存跟进记录</Button>
      </form>}</div></Panel></div>
  </>
}
