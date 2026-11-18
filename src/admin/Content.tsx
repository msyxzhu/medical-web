import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CONTENT_LABELS, sameCourseCopy, staffName } from './domain.ts'
import type { ManagedLesson } from './domain.ts'
import { adminService } from './services/index.ts'
import { useAction, useRecordDraft, useWorkspace } from './workspace.tsx'
import { BackLink, PageHeading, Panel } from './components.tsx'
import { Button, Empty, Icon, Modal, Notice, formatDate } from '../shared/ui.tsx'

export function ContentList() {
  const { workspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const lessons = workspace.lessons.filter(item => item.draft.title.includes(query.trim()))
  return <>
    <PageHeading eyebrow="COURSE LIBRARY" title="课程内容" description="先整理草稿，经专业审核后发布。已发布版本不会被草稿修改覆盖。" />
    <div className="content-banner"><span className="task-icon"><Icon name="book" size={27} /></span><div><h2>情绪与行动练习</h2><p>抑郁主题 · 10 课目录 · 前两课已有资料</p></div><span className="tag">图文 + 练习</span></div>
    <section className="panel"><div className="toolbar"><label className="search-field"><Icon name="search" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索课程名称" aria-label="搜索课程" /></label><span className="muted small">{lessons.length} 节课程</span></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="课程内容列表"><table><thead><tr><th>课程</th><th>编辑状态</th><th>已发布版本</th><th>最近整理</th><th>操作</th></tr></thead><tbody>{lessons.map(lesson => <tr key={lesson.id}><td><div className="course-table-title"><span>{String(lesson.order).padStart(2, '0')}</span><strong>{lesson.draft.title}</strong></div></td><td><span className={`tag ${lesson.stage === 'reviewing' ? 'tag-warm' : lesson.stage === 'draft' ? 'tag-neutral' : ''}`}>{CONTENT_LABELS[lesson.stage]}</span></td><td>{lesson.version ? `v${lesson.version}` : '尚未发布'}</td><td className="muted">{formatDate(lesson.updatedAt)}</td><td><Link className="text-link" to={`/content/${lesson.id}`}>{workspace.staff.role === 'manager' ? '查看与编辑' : '查看与审核'}</Link></td></tr>)}</tbody></table></div>
      {!lessons.length && <Empty title="没有找到课程" />}
    </section>
  </>
}
function LessonEditor({ lesson }: { lesson: ManagedLesson }) {
  const { workspace } = useWorkspace()
  const action = useAction()
  const draft = useRecordDraft(lesson.draft, JSON.stringify(lesson))
  const { value: copy, update: setCopy } = draft
  const [note, setNote] = useState('')
  const [review, setReview] = useState<'approve' | 'return' | null>(null)
  const [publishing, setPublishing] = useState(false)
  const editing = workspace.staff.role === 'manager'
  const dirty = !sameCourseCopy(copy, lesson.draft)
  const canSave = editing && dirty && !action.busy && !draft.conflict && Boolean(copy.title.trim() && copy.goal.trim() && copy.body.trim())
  return <>
    <BackLink to="/content">课程内容</BackLink>
    <PageHeading eyebrow={`LESSON ${String(lesson.order).padStart(2, '0')}`} title={lesson.draft.title} description="草稿 → 专业审核 → 管理发布。发布仅记录本机版本，不同步官网或微信。">
      <span className="tag">{CONTENT_LABELS[lesson.stage]}</span>
    </PageHeading>
    <div className="detail-grid content-editor"><Panel title={editing ? '编辑课程草稿' : '课程内容'}><form className="panel-body form-stack" onSubmit={async event => { event.preventDefault(); if (canSave && await action.run(() => adminService.saveContent({ lessonId: lesson.id, copy, revision: workspace.revision }), '课程草稿已保存，已发布版本保持不变。')) draft.discard() }}>
      {editing ? <>
        <label className="field">课程名称<input maxLength={60} required disabled={action.busy} value={copy.title} onChange={event => setCopy({ ...copy, title: event.target.value })} /></label>
        <label className="field">课程目标<input maxLength={200} required disabled={action.busy} value={copy.goal} onChange={event => setCopy({ ...copy, goal: event.target.value })} /></label>
        <label className="field">图文内容<textarea rows={16} required maxLength={12000} disabled={action.busy} value={copy.body} onChange={event => setCopy({ ...copy, body: event.target.value })} placeholder="请按已提供、经允许使用的资料整理课程内容。" /><span className="field-hint">当前采用纯文本分段，不支持上传视频或富文本嵌入。</span></label>
        {draft.conflict && <Notice tone="warning">这节课已有更新。为避免覆盖，已保留本页输入；可先复制需要的文字，再读取最新版。<Button variant="secondary" onClick={draft.discard}>放弃本页修改，读取最新版</Button></Notice>}
        <div className="form-actions"><span className="muted small">{dirty ? '有未保存的修改' : '与已保存草稿一致'}</span><Button type="submit" busy={action.busy} disabled={!canSave}>保存草稿</Button></div>
      </> : <><h3>{lesson.draft.goal}</h3><div className="prose">{lesson.draft.body || '内容尚未整理。'}</div></>}
      {action.error && <Notice tone="error">{action.error}</Notice>}
    </form></Panel>
      <div className="stack"><Panel title="审核与发布"><div className="panel-body form-stack">
        <ol className="flow-steps"><li className={lesson.stage === 'draft' ? 'current' : ''}><span>1</span>整理课程草稿</li><li className={['reviewing', 'approved'].includes(lesson.stage) ? 'current' : ''}><span>2</span>治疗师审核</li><li className={lesson.stage === 'published' ? 'current' : ''}><span>3</span>发布可回溯版本</li></ol>
        <p className="muted small">审核人：{staffName(lesson.reviewedBy)}<br />已发布：{lesson.version ? `v${lesson.version}` : '尚无版本'}</p>
        {lesson.reviewNote && <div className="review-note"><strong>审核意见</strong><p>{lesson.reviewNote}</p></div>}
        {editing && lesson.stage === 'draft' && <Button variant="secondary" disabled={dirty || draft.conflict || !lesson.draft.body.trim() || action.busy} onClick={() => action.run(() => adminService.submitContent(lesson.id, workspace.revision), '已提交课程审核，请切换治疗师身份审核。')}>提交审核</Button>}
        {editing && dirty && <p className="field-hint">请先保存修改，再提交审核。</p>}
        {!editing && lesson.stage === 'reviewing' && <><Button onClick={() => setReview('approve')}>审核通过</Button><Button variant="secondary" onClick={() => setReview('return')}>退回修改</Button></>}
        {editing && lesson.stage === 'approved' && <Button disabled={dirty || draft.conflict} onClick={() => setPublishing(true)}>发布新版本</Button>}
        {lesson.stage === 'reviewing' && editing && <Notice>等待治疗师核对。编辑者不能自行审核发布。</Notice>}
      </div></Panel><Notice>本机内容版本仅用于流程评审。正式发布前，还需核对授权、专业审核和服务准入。</Notice></div>
    </div>
    {review && <Modal title={review === 'approve' ? '记录审核通过' : '退回课程修改'} onClose={() => setReview(null)} busy={action.busy}><form onSubmit={async event => { event.preventDefault(); if (await action.run(() => adminService.reviewContent({ lessonId: lesson.id, approve: review === 'approve', note, revision: workspace.revision }), '审核意见已记录。')) { setReview(null); setNote('') } }}><label className="field">审核意见<textarea required maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="记录审核范围、需注意的边界或需要修改之处。" /></label>{action.error && <Notice tone="error">{action.error}</Notice>}<div className="form-actions"><Button variant="ghost" onClick={() => setReview(null)} disabled={action.busy}>取消</Button><Button type="submit" busy={action.busy}>确认记录</Button></div></form></Modal>}
    {publishing && <Modal title={`发布本机版本 v${lesson.version + 1}？`} onClose={() => setPublishing(false)} busy={action.busy}><p className="muted">审核通过的草稿将成为新的已发布版本。此操作不会上传资料，也不会改变微信或官网内容。</p>{action.error && <Notice tone="error">{action.error}</Notice>}<div className="form-actions"><Button variant="ghost" onClick={() => setPublishing(false)} disabled={action.busy}>取消</Button><Button busy={action.busy} onClick={async () => { if (await action.run(() => adminService.publishContent(lesson.id, workspace.revision), '本机课程版本已发布。')) setPublishing(false) }}>确认发布</Button></div></Modal>}
  </>
}
export function ContentDetail() {
  const { id } = useParams()
  const { workspace } = useWorkspace()
  const lesson = workspace.lessons.find(item => item.id === id)
  return lesson ? <LessonEditor key={lesson.id} lesson={lesson} /> : <><BackLink to="/content">返回课程内容</BackLink><Empty title="课程不存在" /></>
}
