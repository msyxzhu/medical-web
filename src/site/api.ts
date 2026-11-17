import { COURSES, PROGRAM_DESCRIPTION, PROGRAM_TITLE } from '../shared/content.ts'
import type { CourseContent } from '../shared/content.ts'

export interface PublicProgram {
  title: string
  description: string
  courses: CourseContent[]
}
export interface PublicSiteService {
  getProgram(): Promise<PublicProgram>
}
export const publicSiteService: PublicSiteService = {
  async getProgram() {
    return { title: PROGRAM_TITLE, description: PROGRAM_DESCRIPTION, courses: COURSES.map(course => ({ ...course })) }
  },
}
