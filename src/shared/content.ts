export const BRAND = '情绪与行动'
export const PROGRAM_TITLE = '情绪与行动练习'
export const PROGRAM_DESCRIPTION = '从观察活动与心情开始，逐步理解想法，重新连接日常生活。'

export interface CourseContent {
  id: string
  order: number
  title: string
  goal: string
  body: string
}

const titles = [
  '认识抑郁的下行循环', '记录活动和心情', '从小行动开始', '建立自我照顾的节律',
  '发现低落时的自动思维', '形成更完整的看法', '从反刍回到眼前的动作',
  '解决一个现实问题', '减少回避并练习求助', '巩固恢复并应对低落波动',
]

export const COURSES: CourseContent[] = titles.map((title, index) => ({
  id: `depression-${String(index + 1).padStart(2, '0')}`,
  order: index + 1,
  title,
  goal: index === 0 ? '理解症状怎样影响日常，选一个希望恢复的行为。'
    : index === 1 ? '观察活动与心情的联系，发现适合自己的小行动。' : '课程资料整理中',
  body: index === 0
    ? '低落可能影响兴趣、精力和日常行动。活动减少后，照顾自己、与人连接的机会也可能变少。\n\n这一课请你观察一个具体片段：发生了什么，脑中出现什么想法，身体和心情有什么变化，之后做了什么。\n\n从一个可观察的小变化开始。例如，“周三晚饭后出门五分钟”，比“我一定要马上好起来”更方便回顾。\n\n配套练习：记录两条下行循环，再写下一项希望恢复的日常活动。'
    : index === 1
      ? '活动记录不是给一天打“好坏”分，而是帮助我们看见规律。\n\n选择心情或精力，用同一把 0–10 分尺记录活动前后的体验。分数没有改变时，愉快、成就或连接感也值得留意。\n\n记录至少两天，每天各选一项消耗活动和一项可能帮到自己的活动，再找出一个方便开始的小步骤。'
      : '',
}))

export const SOURCE_NOTE = '依据项目方提供的抑郁课程概述、前两课及配套作业资料整理。'
export const SUPPORT_TEXT = '如果无法保证自身或他人的安全，请及时联系当地急救、前往最近的急诊，并寻求身边可信任的人陪伴。不要等待网页或小程序回复。'
export const CATEGORIES = [
  { title: '跨诊断基础', text: '情绪识别、压力管理与生活节律。关注不同困扰中可以共同练习的基础技能。', state: '内容规划中' },
  { title: '抑郁主题', text: '从活动与心情记录开始，在结构化课程中练习理解想法、恢复日常行动。', state: '了解当前课程' },
  { title: '生活质量', text: '围绕自我关怀、关系与生活重建，逐步积累适合自己的支持方式。', state: '内容规划中' },
]
