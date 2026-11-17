import { COURSES } from '../../shared/content.ts'
import type { Database, Participant } from '../domain.ts'

export function createSeed(now: string): Database {
  const people: Array<[string, string, Participant['stage'], Participant['clinicianId'], number]> = [
    ['P1001', '小禾', 'waiting', null, 0],
    ['P1002', '小青', 'learning', 'clinician-a', 1],
    ['P1003', '小川', 'learning', 'clinician-a', 2],
    ['P1004', '小林', 'learning', 'clinician-b', 1],
    ['P1005', '小满', 'post', 'clinician-a', 10],
    ['P1006', '小雨', 'completed', 'clinician-b', 10],
    ['P1007', '小夏', 'baseline', null, 0],
    ['P1008', '小安', 'learning', 'clinician-a', 0],
  ]
  const participants: Participant[] = people.map(([id, alias, stage, clinicianId, completedLessons], index) => ({
    id, alias, stage, clinicianId, completedLessons, joinedAt: now,
    ageBand: index % 2 ? '30–44 岁' : '18–29 岁', consentVersion: '本机使用说明 v1',
    group: clinicianId ? '情绪与行动 · 第一组' : null,
    paused: id === 'P1003', supportHold: id === 'P1008',
    assessments: stage === 'baseline' ? [] : [{
      id: `assessment-${id}`, label: '开始前记录', at: now,
      phq: 5 + index, gad: 3 + index, attention: id === 'P1008',
    }, ...(stage === 'completed' ? [{ id: `post-${id}`, label: '结束记录', at: now, phq: 6, gad: 4, attention: false }] : [])],
  }))
  return {
    schemaVersion: 1, revision: 0, sequence: 100, staffId: null, participants,
    submissions: [
      {
        id: 'W1001', participantId: 'P1002', title: '我的抑郁循环与恢复目标', submittedAt: now, feedback: null,
        answers: [
          { label: '具体情境', value: '早上看到待办，想到要做的事情很多。' },
          { label: '想法、心情与行动', value: '感到疲惫，先坐了一会儿，没有立即开始。' },
          { label: '下一步目标', value: '午饭后整理桌面五分钟，观察是否更容易开始。' },
        ],
      },
      {
        id: 'W1002', participantId: 'P1004', title: '我的活动与心情记录', submittedAt: now, feedback: null,
        answers: [
          { label: '活动记录', value: '午饭后走到窗边站一会儿，并和同事说了几句话。' },
          { label: '精力与连接', value: '精力记录为 4/10，感到有一点连接感。' },
          { label: '观察', value: '下午安排短一点的活动更容易开始。' },
        ],
      },
    ],
    supportCases: [{
      id: 'R1001', participantId: 'P1008', createdAt: now,
      reason: '开始前问卷存在需优先关注的回答，常规学习已暂缓。',
      state: 'open', notes: [],
    }],
    lessons: COURSES.map(course => ({
      id: course.id, order: course.order,
      draft: { title: course.title, goal: course.goal, body: course.body },
      published: course.order < 3 ? { title: course.title, goal: course.goal, body: course.body } : null,
      stage: course.order < 3 ? 'published' : 'draft',
      version: course.order < 3 ? 1 : 0,
      editedBy: null, reviewedBy: null, reviewNote: '', updatedAt: now,
    })),
    messages: [], audit: [],
  }
}
