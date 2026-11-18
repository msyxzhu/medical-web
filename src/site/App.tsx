import { useEffect, useRef, useState } from 'react'
import { BRAND, CATEGORIES, SOURCE_NOTE, SUPPORT_TEXT } from '../shared/content.ts'
import type { CourseContent } from '../shared/content.ts'
import { Brand, Button, Icon, Modal, Notice, PlantArt } from '../shared/ui.tsx'
import { ADMIN_PATH } from '../shared/paths.ts'
import { publicSiteService } from './api.ts'
import type { PublicProgram } from './api.ts'

type InfoPage = 'participate' | 'privacy' | 'terms' | 'support'
const INFO_TITLES: Record<InfoPage, string> = {
  participate: '怎样开始参与', privacy: '关于记录与隐私', terms: '服务范围与使用说明', support: '需要及时帮助时',
}
const FAQ = [
  { title: '这和普通的科普文章有什么不同？', body: '每节课围绕一个具体主题，结合内容讲解、自检与练习记录。你可以从一小步开始，之后再回看自己实际尝试了什么。' },
  { title: '填写问卷就会得到诊断吗？', body: '不会。量表用于记录状态，分数不能代替专业评估，也不提供诊断、处方或药物调整建议。有需要额外关注的回答时，应优先寻求专业支持。' },
  { title: '学习需要一次完成吗？', body: '不需要。建议每周留出一次学习时间，每课约 10–20 分钟，再在日常中尝试练习。小程序支持保存草稿和之后续填，也可以暂停参与。' },
  { title: '可以在这里联系治疗师或获得急救吗？', body: '当前网站不提供即时咨询、预约或急救服务，也没有实时人工值守。专业支持的范围、响应时间和联系方式，需要在正式参与前由项目方说明。' },
]

function InfoContent({ type }: { type: InfoPage }) {
  if (type === 'participate') return <div className="form-stack">
    <div className="entry-guide"><div className="phone-outline"><span /><Icon name="leaf" size={40} /><small>微信小程序</small></div><div><h3>把练习带回日常</h3><p>小程序是学习和记录的主要入口。</p><span className="tag tag-neutral">公开入口待确认</span></div></div>
    <ol className="simple-list"><li>先了解项目内容与服务边界。</li><li>向项目组织方索取经确认的微信入口和参与说明。</li><li>在小程序中确认说明、填写基本资料与开始前问卷。</li><li>根据专业人员的安排进入课程与练习。</li></ol>
    <Notice>当前网页不收集报名信息。正式二维码、机构名称及联系渠道尚未确认，不展示无法使用的二维码或虚构联系方式。</Notice>
  </div>
  if (type === 'privacy') return <div className="prose"><p>当前公开展示页不收集姓名、联系方式或健康信息，不设置报名表，也未接入统计追踪服务。</p><h3>关于工作台与小程序</h3><p>当前评审版本分别使用本机存储，彼此不自动同步。请只使用虚构资料；不要录入真实身份、答卷或其他敏感信息。</p><h3>正式使用之前</h3><p>项目方需要另行确认个人信息处理目的、保存时间、数据访问与删除方式，以及正式隐私文件和知情同意。当前说明不能替代这些文件。</p></div>
  if (type === 'support') return <div className="form-stack"><Notice tone="warning">{SUPPORT_TEXT}</Notice><div className="prose"><p>本平台不承担急诊处置，也不默认提供 24 小时人工服务。页面上的学习资料不能替代线下诊疗。</p><p>当常规学习不再适合当前状态时，应先由专业人员评估后续支持与安排。不要以量表总分或继续完成课程来代替专业判断。</p></div></div>
  return <div className="prose"><p>本项目展示结构化心理支持的内容与流程，包括课程、练习、记录与反馈。首期围绕抑郁主题，当前提供前两课内容说明。</p><h3>它不是什么</h3><p>不提供精神科诊断、处方、用药调整、疗效保证或即时危机处置。专业人员应根据实际情况判断参与范围与支持强度。</p><h3>内容与参与</h3><p>{SOURCE_NOTE}所有课程内容、专业审核、授权、服务时段与责任边界都需要在正式开放前进一步确认。</p></div>
}

export function SiteApp() {
  const [menu, setMenu] = useState(false)
  const menuToggle = useRef<HTMLButtonElement>(null)
  const [program, setProgram] = useState<PublicProgram | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [course, setCourse] = useState<CourseContent | null>(null)
  const [info, setInfo] = useState<InfoPage | null>(null)
  async function loadProgram() {
    setError('')
    try { setProgram(await publicSiteService.getProgram()) }
    catch (problem) { console.error('[public.program]', problem); setError('课程介绍暂时无法读取，请重试。') }
  }
  useEffect(() => { void loadProgram() }, [])
  const closeMenu = () => setMenu(false)
  return <div className="site">
    <a className="skip-link" href="#site-main">跳到主要内容</a>
    <header className="site-header"><div className="site-header-inner"><a href="#top" onClick={closeMenu} aria-label={`${BRAND}首页`}><Brand /></a>
      <button ref={menuToggle} className="icon-btn site-menu-toggle" aria-label={menu ? '收起导航' : '展开导航'} aria-controls="site-nav" aria-expanded={menu} onClick={() => setMenu(!menu)} onKeyDown={event => { if (event.key === 'Escape') closeMenu() }}><Icon name={menu ? 'close' : 'menu'} /></button>
      <nav id="site-nav" className={menu ? 'site-nav is-open' : 'site-nav'} aria-label="网站导航" onKeyDown={event => { if (menu && event.key === 'Escape') { closeMenu(); menuToggle.current?.focus() } }}>
        <a href="#about" onClick={closeMenu}>关于项目</a><a href="#program" onClick={closeMenu}>课程与练习</a><a href="#journey" onClick={closeMenu}>参与方式</a><a href="#questions" onClick={closeMenu}>常见问题</a><a href={ADMIN_PATH} className="btn btn-secondary">专业工作台 <Icon name="arrow" size={15} /></a>
      </nav>
    </div></header>
    <main id="site-main">
      <section id="top" className="hero-section site-container">
        <div className="hero-copy"><span className="hero-eyebrow"><i />给自己一点时间，也给改变一点空间</span><h1>从一小步开始，<br />重新连接<span>生活。</span></h1><p>把理解带进日常，把练习留在身边。<br />通过结构化课程与记录，慢慢找到适合自己的行动。</p>
          <div className="hero-buttons"><a className="btn btn-primary" href="#program">了解课程与练习 <Icon name="arrow" size={18} /></a><Button variant="ghost" onClick={() => setInfo('participate')}>怎样参与 <Icon name="chevron" size={16} /></Button></div>
          <div className="hero-note"><Icon name="shield" size={16} />以专业支持为边界，不替代诊疗。</div>
        </div>
        <div className="hero-visual"><div className="hero-circle" /><PlantArt /><div className="art-note"><span className="tiny-leaf"><Icon name="leaf" size={19} /></span><div><strong>不必一次做好所有事</strong><small>今天，先从一个小步骤开始。</small></div></div><span className="art-caption">A LITTLE SPACE. A SMALL STEP.</span></div>
      </section>
      <div className="intro-strip site-container"><div><Icon name="book" /><span>有结构的课程</span></div><div><Icon name="log" /><span>可回顾的练习</span></div><div><Icon name="clock" /><span>按自己的节奏</span></div><div><Icon name="shield" /><span>有边界的支持</span></div></div>
      <section id="about" className="site-container about-section">
        <div className="section-lead"><p className="eyebrow">ABOUT THE PROGRAM</p><h2>不只是了解，<br />更是在生活里试一试。</h2></div>
        <div className="about-copy"><p>有时，知道该做什么和真正开始之间，还需要一段温柔而具体的过程。这里把主题讲解、练习和记录放在一起，让每个小步骤都可以被看见、被回顾。</p><p>内容分为跨诊断基础、专病主题与生活质量三个层次。首期从抑郁相关的情绪与行动练习开始，再逐步扩展。</p><a href="#journey" className="site-text-link">看看一段学习是怎样发生的 <Icon name="arrow" size={17} /></a></div>
      </section>
      <section className="topics-section"><div className="site-container"><div className="section-heading"><div><p className="eyebrow">THREE CONNECTED LAYERS</p><h2>从理解自己，到重新参与生活</h2></div><p>共同的基础，具体的主题，<br />以及照顾生活的长期练习。</p></div>
        <div className="topic-grid">{CATEGORIES.map((item, index) => <article key={item.title} className={`topic-card topic-${index}`}><div className="topic-number">0{index + 1}<Icon name={index === 0 ? 'leaf' : index === 1 ? 'book' : 'people'} size={24} /></div><h3>{item.title}</h3><p>{item.text}</p>{index === 1 ? <a href="#program" className="site-text-link">{item.state} <Icon name="arrow" size={17} /></a> : <span className="topic-state">{item.state}</span>}</article>)}</div>
      </div></section>
      <section id="program" className="site-container program-section">
        <div className="program-intro"><p className="eyebrow">A STRUCTURED LEARNING JOURNEY</p><h2>情绪与行动练习</h2><p>{program?.description ?? '从理解日常的状态开始，留下一点行动与观察。'}</p><div className="program-tags"><span className="tag">抑郁主题</span><span className="tag">10 课目录</span><span className="tag">每课约 10–20 分钟</span></div>
          <div className="program-fact"><span><Icon name="clock" size={17} />建议每周一课</span><p>把阅读和练习分开安排，不必一次完成。</p></div>
          <div className="program-fact"><span><Icon name="message" size={17} />记录之后，再回看</span><p>练习用来观察自己的过程，不给一天打“好坏”分。</p></div>
          <Button onClick={() => setInfo('participate')}>了解参与方式 <Icon name="arrow" size={17} /></Button>
          <p className="program-boundary">课程不替代专业诊疗，参与前应了解适用范围。当前仅前两课可查看内容说明。</p>
        </div>
        <div className="public-course-list">
          <header><h3>从第一课开始</h3><span>图文 · 自检 · 练习</span></header>
          {error && <div className="form-stack"><Notice tone="error">{error}</Notice><Button variant="secondary" onClick={() => void loadProgram()}>重新读取</Button></div>}
          {!program && !error && <Notice>正在整理课程目录…</Notice>}
          {program?.courses.slice(0, expanded ? 10 : 4).map(item => item.body ? <button className="public-course-row" key={item.id} onClick={() => setCourse(item)}><span className="course-number">{String(item.order).padStart(2, '0')}</span><span className="course-info"><strong>{item.title}</strong><small>{item.goal}</small></span><Icon name="arrow" size={19} /></button>
            : <div className="public-course-row course-preparing" key={item.id}><span className="course-number">{String(item.order).padStart(2, '0')}</span><span className="course-info"><strong>{item.title}</strong><small>资料整理中</small></span><span className="tag tag-neutral">待开放</span></div>)}
          {program && <button className="show-courses" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? '收起课程目录' : '查看全部 10 课目录'}<Icon name="chevron" size={15} /></button>}
        </div>
      </section>
      <section id="journey" className="journey-section"><div className="site-container"><div className="section-heading centered"><p className="eyebrow">YOUR OWN PACE</p><h2>开始，不需要一步到位。</h2><p>了解边界、记录状态，再按安排进入学习。</p></div>
        <div className="journey-grid">{[
          ['了解与确认', '阅读项目与使用说明，了解记录方式和服务范围。'],
          ['记录开始状态', '完成基本信息与开始前问卷，必要时先获得专业支持。'],
          ['进入课程与练习', '由专业人员安排学习内容，在小程序中阅读、练习和保存记录。'],
          ['回顾与获得支持', '按安排复测，回看练习与反馈，必要时暂停或调整支持。'],
        ].map(([title, text], index) => <article key={title}><span className="journey-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        <div className="journey-bottom"><p>学习与记录以微信小程序为主要入口。</p><Button variant="secondary" onClick={() => setInfo('participate')}>查看参与说明 <Icon name="arrow" size={16} /></Button></div>
      </div></section>
      <section id="questions" className="site-container faq-section"><div className="section-lead"><p className="eyebrow">BEFORE YOU BEGIN</p><h2>你可能想先了解</h2><p>有些事情，开始前说清楚。</p><button className="site-text-link" onClick={() => setInfo('terms')}>查看完整服务边界 <Icon name="arrow" size={16} /></button></div><div className="faq-list">{FAQ.map(item => <details key={item.title}><summary>{item.title}<span>+</span></summary><p>{item.body}</p></details>)}</div></section>
      <section className="site-container support-section"><div className="support-symbol"><Icon name="shield" size={30} /></div><div><h2>需要及时帮助时，请优先联系专业支持。</h2><p>这里不是即时咨询或紧急求助渠道。如果无法保证安全，请及时寻求线下帮助，不要等待页面回复。</p></div><Button variant="secondary" onClick={() => setInfo('support')}>查看求助说明 <Icon name="arrow" size={16} /></Button></section>
    </main>
    <footer className="site-footer"><div className="site-container"><div className="footer-main"><div><Brand /><p>给理解一点空间，给行动一个开始。</p></div><nav aria-label="页脚导航"><a href="#program">课程与练习</a><button onClick={() => setInfo('privacy')}>记录与隐私</button><button onClick={() => setInfo('terms')}>服务说明</button><a href={ADMIN_PATH}>专业工作台</a></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {BRAND}</span><span>项目资料展示 · 不提供诊断、处方或急诊服务</span></div></div></footer>
    {info && <Modal title={INFO_TITLES[info]} onClose={() => setInfo(null)}><InfoContent type={info} /></Modal>}
    {course && <Modal title={course.title} onClose={() => setCourse(null)}><div className="course-preview"><p className="eyebrow">第 {course.order} 课 · 内容说明</p><h3>{course.goal}</h3><div className="prose">{course.body}</div><p className="source-note">{SOURCE_NOTE}完整练习与个人记录在小程序中进行。</p><Button onClick={() => { setCourse(null); setInfo('participate') }}>了解参与方式 <Icon name="arrow" size={16} /></Button></div></Modal>}
  </div>
}
