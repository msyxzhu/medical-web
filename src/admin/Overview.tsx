import { Link } from 'react-router-dom'
import { useWorkspace } from './workspace.tsx'
import { PageHeading, Panel, ParticipantLink, StatusTag } from './components.tsx'
import { Empty, Icon, formatDate } from '../shared/ui.tsx'
import { statusOf } from './domain.ts'

export function Overview() {
  const { workspace } = useWorkspace()
  const waiting = workspace.participants.filter(person => statusOf(person) === 'waiting')
  const pending = workspace.submissions.filter(record => !record.feedback?.sentAt)
  const reviews = workspace.supportCases.filter(item => item.state !== 'referred')
  const learning = workspace.participants.filter(person => statusOf(person) === 'learning')
  const metrics = [
    { title: '当前参与者', value: workspace.participants.length, note: workspace.staff.role === 'manager' ? '当前工作区全部记录' : '分配给当前身份的记录', to: '/participants', icon: 'people' as const },
    { title: '等待安排', value: waiting.length, note: '已评估 · 等待人工分组', to: '/participants?status=waiting', icon: 'clock' as const },
    { title: '待反馈练习', value: pending.length, note: '查看记录，再写一点反馈', to: '/reviews', icon: 'message' as const },
    { title: '待跟进事项', value: reviews.length, note: '优先查看人工复核队列', to: '/support', icon: 'shield' as const },
  ]
  return <>
    <PageHeading eyebrow="WORKSPACE / OVERVIEW" title="每一份记录，都值得被看见。" description="从今天的待办开始，衔接评估、学习与专业支持。">
      <Link to="/participants?status=waiting" className="btn btn-primary">查看待安排 <Icon name="arrow" size={17} /></Link>
    </PageHeading>
    <div className="metrics">{metrics.map(metric => <Link className={`metric ${metric.icon === 'shield' ? 'metric-warm' : ''}`} key={metric.title} to={metric.to}>
      <div className="metric-top"><span>{metric.title}</span><Icon name={metric.icon} /></div><strong>{metric.value}<small>项</small></strong><p>{metric.note}</p>
    </Link>)}</div>
    <div className="dashboard-columns">
      <Panel title="先处理这些事项" action={<Link className="text-link" to="/reviews">全部工作 <Icon name="arrow" size={15} /></Link>}>
        {reviews.map(item => <Link key={item.id} className="task-card task-warm" to={`/support/${item.id}`}><span className="task-icon"><Icon name="shield" /></span><div><h3>一条记录需要优先复核</h3><p>{workspace.participants.find(person => person.id === item.participantId)?.alias} · 常规学习已暂缓</p></div><Icon name="chevron" size={17} /></Link>)}
        {waiting.map(person => <Link key={person.id} className="task-card" to={`/participants/${person.id}`}><span className="task-icon"><Icon name="people" /></span><div><h3>{person.alias}正在等待课程安排</h3><p>开始前评估已完成 · 可分配项目与负责人员</p></div><Icon name="chevron" size={17} /></Link>)}
        {pending.slice(0, 3).map(record => <Link key={record.id} className="task-card" to={`/reviews/${record.id}`}><span className="task-icon"><Icon name="message" /></span><div><h3>{record.title}</h3><p>{workspace.participants.find(person => person.id === record.participantId)?.alias} · {record.feedback ? '已有反馈草稿' : '等待查看与反馈'}</p></div><Icon name="chevron" size={17} /></Link>)}
        {!reviews.length && !waiting.length && !pending.length && <Empty title="当前待办已处理">可以回看记录，或到课程内容中继续整理。</Empty>}
      </Panel>
      <Panel title="参与概况" className="participation-summary">
        <div className="summary-orbit" style={{ background: `conic-gradient(#75a563 ${learning.length / Math.max(1, workspace.participants.length) * 100}%, #e5eddf 0)` }}><div><strong>{learning.length}</strong><span>正在学习</span></div></div>
        <p className="muted small">只展示当前身份可见的参与记录，不据此判断疗效。</p>
        <div className="legend"><span><i />学习中</span><strong>{learning.length}</strong></div>
        <div className="legend"><span><i className="dot-warm" />待安排 / 待评估</span><strong>{workspace.participants.filter(person => ['baseline', 'waiting'].includes(statusOf(person))).length}</strong></div>
        <div className="legend"><span><i className="dot-soft" />其他参与状态</span><strong>{workspace.participants.length - learning.length - workspace.participants.filter(person => ['baseline', 'waiting'].includes(statusOf(person))).length}</strong></div>
      </Panel>
    </div>
    <Panel title="参与者一览" action={<Link to="/participants" className="text-link">查看全部 <Icon name="arrow" size={15} /></Link>}>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="参与者概览"><table><thead><tr><th>参与者</th><th>当前状态</th><th>学习进度</th><th>最近评估</th><th>操作</th></tr></thead><tbody>
        {workspace.participants.slice(0, 4).map(person => {
          const latest = person.assessments.at(-1)
          return <tr key={person.id}><td><ParticipantLink person={person} /></td><td><StatusTag person={person} /></td><td><div className="progress-cell"><div className="progress-track"><span style={{ width: `${person.completedLessons * 10}%` }} /></div><span>{person.completedLessons} / 10</span></div></td><td className="muted">{latest ? formatDate(latest.at) : '尚未填写'}</td><td><Link className="text-link" to={`/participants/${person.id}`}>查看详情</Link></td></tr>
        })}
      </tbody></table></div>
    </Panel>
  </>
}
