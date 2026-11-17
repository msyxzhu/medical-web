import { useCallback, useEffect, useState } from 'react'
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { STAFF } from './domain.ts'
import type { StaffId, Workspace } from './domain.ts'
import { adminService, localTools } from './services/index.ts'
import { errorMessage, WorkspaceContext } from './workspace.tsx'
import { Overview } from './Overview.tsx'
import { ParticipantDetail, Participants } from './Participants.tsx'
import { ReviewDetail, Reviews } from './Reviews.tsx'
import { SupportDetail, SupportQueue } from './Support.tsx'
import { ContentDetail, ContentList } from './Content.tsx'
import { Operations } from './Operations.tsx'
import { Brand, Button, Empty, Icon, Modal, Notice, PlantArt } from '../shared/ui.tsx'
import type { IconName } from '../shared/ui.tsx'
import { SITE_PATH } from '../shared/paths.ts'

const navigation: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: '工作概览', icon: 'home' },
  { to: '/participants', label: '参与者管理', icon: 'people' },
  { to: '/reviews', label: '练习反馈', icon: 'message' },
  { to: '/support', label: '人工复核', icon: 'shield' },
  { to: '/content', label: '课程内容', icon: 'book' },
  { to: '/operations', label: '操作记录', icon: 'log' },
]

function Login({ reload, error: loadError }: { reload: () => Promise<void>; error: string }) {
  const [selected, setSelected] = useState<StaffId>('manager')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState(false)
  async function enter() {
    if (!accepted || busy) return
    setBusy(true); setError('')
    try { await adminService.signIn(selected); await reload() }
    catch (problem) { setError(errorMessage(problem)) }
    finally { setBusy(false) }
  }
  return <div className="login-page"><section className="login-story"><a href={SITE_PATH}><Brand /></a><div><p className="eyebrow">PROFESSIONAL WORKSPACE</p><h1>让支持有迹可循，<br />让每一步被看见。</h1><p>连接学习记录与专业工作，<br />从一份具体的练习开始。</p><PlantArt /></div><p className="login-foot">有边界的支持 · 可回顾的过程</p></section>
    <main className="login-form"><div><p className="eyebrow">WELCOME BACK</p><h2>进入工作台</h2><p className="muted">选择工作身份，查看对应的工作范围。</p></div>
      <form className="form-stack" onSubmit={event => { event.preventDefault(); void enter() }}>
        <fieldset className="role-picker"><legend>工作身份</legend>{STAFF.map(staff => <label key={staff.id} className={selected === staff.id ? 'selected' : ''}><input type="radio" name="staff" value={staff.id} checked={selected === staff.id} onChange={() => setSelected(staff.id)} /><span><strong>{staff.name}</strong><small>{staff.role === 'manager' ? '参与安排、内容管理与操作记录' : '分配给我的参与者、反馈与审核'}</small></span><Icon name={staff.role === 'manager' ? 'people' : 'message'} /></label>)}</fieldset>
        <label className="check-label"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>我了解这是本机评审工作区，使用虚构资料；不填写真实个人或健康信息，不会向微信发送消息。</span></label>
        {(error || loadError) && <Notice tone="error">{error || loadError}</Notice>}
        <Button type="submit" disabled={!accepted} busy={busy} className="btn-wide">进入工作台 <Icon name="arrow" size={18} /></Button>
      </form>
      <div className="login-links"><a href={SITE_PATH}>← 返回项目介绍</a>{loadError && <button className="text-link" onClick={() => setReset(true)}>重置本机工作区</button>}</div>
      <p className="login-disclosure">当前未接入正式账号系统。工作记录只保存在此浏览器，不与微信小程序互通。</p>
    </main>
    {reset && <Modal title="恢复预置工作区？" onClose={() => setReset(false)} busy={busy}><p className="muted">这会清除当前后台工作记录，恢复虚构预置资料。不会影响小程序或其他网站。</p>{error && <Notice tone="error">{error}</Notice>}<div className="form-actions"><Button variant="ghost" onClick={() => setReset(false)}>取消</Button><Button variant="danger" busy={busy} onClick={async () => { setBusy(true); setError(''); try { await localTools.reset(); await reload(); setReset(false) } catch (problem) { setError(errorMessage(problem)) } finally { setBusy(false) } }}>确认重置</Button></div></Modal>}
  </div>
}
function Shell({ workspace, reload, notify }: { workspace: Workspace; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [location.pathname])
  async function signOut() {
    setBusy(true); setError('')
    try { await adminService.signOut(); await reload() }
    catch (problem) { setError(errorMessage(problem)) }
    finally { setBusy(false) }
  }
  return <WorkspaceContext value={{ workspace, reload, notify }}>
    <div className="admin-shell">
      {open && <button className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><Link to="/" className="sidebar-brand"><Brand small /></Link><span className="nav-caption">专业工作台</span><nav aria-label="工作台导航">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.to === '/support' && workspace.supportCases.some(value => value.state !== 'referred') && <i className="nav-dot" />}</NavLink>)}</nav>
        <div className="sidebar-note"><Icon name="leaf" /><p>从看见开始，<br />陪伴每个小步骤。</p><a href={SITE_PATH}>查看公开网站 <Icon name="arrow" size={14} /></a></div>
        <div className="sidebar-status"><i />本机工作区<span>记录仅存当前浏览器</span></div>
      </aside>
      <div className="admin-body"><header className="admin-topbar"><div className="topbar-title"><button className="icon-btn menu-toggle" aria-label="打开工作台导航" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>心理支持 / <strong>{navigation.find(item => item.to !== '/' && location.pathname.startsWith(item.to))?.label ?? '工作概览'}</strong></span></div><div className="topbar-actions"><button className="icon-btn" aria-label="刷新工作记录" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await reload(); notify('已读取最新本机记录。') } catch (problem) { setError(errorMessage(problem)) } finally { setBusy(false) } }}><Icon name="refresh" size={17} /></button><span className="staff-label"><span className="avatar avatar-small">{workspace.staff.name.slice(-1)}</span>{workspace.staff.name}</span><button className="text-link" onClick={() => void signOut()} disabled={busy}><Icon name="logout" size={16} /><span>切换身份</span></button></div></header>
        <main className="admin-main" id="main-content">{error && <Notice tone="error">{error}</Notice>}<Routes>
          <Route path="/" element={<Overview />} /><Route path="/participants" element={<Participants />} /><Route path="/participants/:id" element={<ParticipantDetail />} />
          <Route path="/reviews" element={<Reviews />} /><Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/support" element={<SupportQueue />} /><Route path="/support/:id" element={<SupportDetail />} />
          <Route path="/content" element={<ContentList />} /><Route path="/content/:id" element={<ContentDetail />} />
          <Route path="/operations" element={<Operations />} /><Route path="*" element={<><Empty title="这个页面不存在" /><Link className="btn btn-primary" to="/">返回工作概览</Link></>} />
        </Routes></main>
        <footer className="admin-footer"><span>情绪与行动 · 专业工作台</span><span>本机记录 · 无真实通知或临床服务</span></footer>
      </div>
    </div>
  </WorkspaceContext>
}
export function AdminApp() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const reload = useCallback(async () => {
    const session = await adminService.getSession()
    const next = session ? await adminService.getWorkspace() : null
    setWorkspace(next)
    setError('')
  }, [])
  useEffect(() => {
    let active = true
    reload().catch(problem => { if (active) setError(errorMessage(problem)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5500); return () => clearTimeout(timer) }, [notice])
  if (loading) return <div className="fatal"><Notice>正在读取工作区…</Notice></div>
  return <HashRouter>{workspace ? <Shell workspace={workspace} reload={reload} notify={setNotice} /> : <><Navigate to="/" replace /><Login reload={reload} error={error} /></>}
    {notice && <div className="toast"><Icon name="check" size={18} /><span role="status">{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
  </HashRouter>
}
