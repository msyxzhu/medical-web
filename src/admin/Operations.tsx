import { useState } from 'react'
import { staffName } from './domain.ts'
import { adminService, localTools } from './services/index.ts'
import { useAction, useWorkspace } from './workspace.tsx'
import { PageHeading, Panel } from './components.tsx'
import { Button, Empty, Icon, Modal, Notice, formatDate } from '../shared/ui.tsx'

export function Operations() {
  const { workspace } = useWorkspace()
  const action = useAction()
  const [reset, setReset] = useState(false)
  const isManager = workspace.staff.role === 'manager'
  async function exportData() {
    let csv = ''
    const saved = await action.run(async () => { csv = await adminService.exportSummary(workspace.revision) }, '已生成概览文件并记录导出操作。')
    if (!saved) return
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = '参与概览.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <PageHeading eyebrow="WORKSPACE RECORDS" title="操作记录" description="分组、反馈、复核和内容版本的重要操作在这里留痕。">
      {isManager && <Button variant="secondary" busy={action.busy} onClick={() => void exportData()}><Icon name="download" size={17} />导出参与概览</Button>}
    </PageHeading>
    {action.error && <Notice tone="error">{action.error}</Notice>}
    <section className="panel"><div className="table-scroll" tabIndex={0} role="region" aria-label="操作日志"><table><thead><tr><th>时间</th><th>操作者</th><th>操作</th><th>对象</th><th>说明</th></tr></thead><tbody>{workspace.audit.map(item => <tr key={item.id}><td className="muted">{formatDate(item.at)}</td><td>{staffName(item.actorId)}</td><td>{item.action}</td><td className="mono">{item.target}</td><td className="table-copy muted">{item.detail}</td></tr>)}</tbody></table></div>
      {!workspace.audit.length && <Empty title="还没有工作操作记录">完成一次分组、反馈或内容操作后，再来查看。</Empty>}
    </section>
    <div className="detail-grid spaced"><Panel title="本机工作区"><div className="panel-body form-stack"><p className="muted small">工作身份、分组、反馈和内容草稿保存在当前浏览器。这里只使用虚构资料，没有真实登录、消息通知或跨端同步。</p><p className="muted small">导出只含参与者编号与进度，不含称呼、评估答案或自由文本。正式科研导出需另行审批。</p>{isManager && <Button variant="danger" onClick={() => setReset(true)}><Icon name="refresh" size={16} />重置本机工作区</Button>}</div></Panel>
      <Panel title="当前身份的操作范围"><div className="panel-body"><p className="muted small">{isManager ? '项目管理可查看全部本机参与者、分组、暂停参与、编辑和发布已审核课程、导出概览。专业反馈与审核由治疗师记录。' : '治疗师仅能查看分配给自己的参与者与练习；可记录反馈和人工复核，并审核课程。不能分组、发布内容或导出全部资料。'}</p><p className="section-note">这些是前端流程约束，不是生产环境的身份认证或数据权限保障。</p></div></Panel></div>
    {reset && <Modal title="重置本机工作区？" busy={action.busy} onClose={() => setReset(false)}><p className="muted">会清除本机的分组变更、反馈、课程编辑和日志，恢复预置记录，并返回工作身份选择。不会清理微信小程序或其他网站数据。此操作无法撤销。</p>{action.error && <Notice tone="error">{action.error}</Notice>}<div className="form-actions"><Button variant="ghost" disabled={action.busy} onClick={() => setReset(false)}>取消</Button><Button variant="danger" busy={action.busy} onClick={() => action.run(() => localTools.reset(), '工作区已重置。')}>确认重置</Button></div></Modal>}
  </>
}
