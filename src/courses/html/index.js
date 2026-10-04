import { part1Lessons } from './part-1.js'
import { part2Lessons } from './part-2.js'
import { part3Lessons } from './part-3.js'
import { part4Lessons } from './part-4.js'

const lessons = [...part1Lessons, ...part2Lessons, ...part3Lessons, ...part4Lessons]

const modules = [
  {
    id: 'module-1',
    title: 'Introduction to HTML',
    description: 'What HTML is, how the web works, and your very first page.',
    lessonIds: ['what-is-html', 'how-websites-work', 'first-html-page', 'html-elements'],
  },
  {
    id: 'module-2',
    title: 'HTML Document Structure',
    description: 'DOCTYPE, the root element, head, body, titles and metadata.',
    lessonIds: ['doctype', 'html-element', 'head-body', 'titles-metadata'],
  },
  {
    id: 'module-3',
    title: 'Working with Text',
    description: 'Headings, paragraphs, line breaks and text formatting.',
    lessonIds: ['headings', 'paragraphs', 'breaks-rules', 'text-formatting'],
  },
  {
    id: 'module-4',
    title: 'Links and Navigation',
    description: 'Anchors, URLs, email links and opening tabs.',
    lessonIds: ['links', 'url-types', 'email-phone-links', 'new-tabs'],
  },
  {
    id: 'module-5',
    title: 'Images and Media',
    description: 'Images, paths, alt text, audio and video.',
    lessonIds: ['images', 'image-paths', 'alt-text', 'audio-video'],
  },
  {
    id: 'module-6',
    title: 'Lists and Tables',
    description: 'Ordered and unordered lists, tables and headers.',
    lessonIds: ['ordered-lists', 'unordered-lists', 'tables', 'table-headers'],
  },
  {
    id: 'module-7',
    title: 'Forms and User Input',
    description: 'Forms, input types, labels, buttons and submission.',
    lessonIds: ['forms', 'input-types', 'labels', 'form-buttons'],
  },
  {
    id: 'module-8',
    title: 'Semantic HTML',
    description: 'Header, main, footer, sections, articles, nav and aside.',
    lessonIds: ['header-main-footer', 'section-article', 'nav-aside', 'semantic-best-practices'],
  },
  {
    id: 'module-9',
    title: 'HTML Best Practices',
    description: 'Comments, nesting, common mistakes and accessibility.',
    lessonIds: ['comments', 'nesting', 'common-mistakes', 'accessibility'],
  },
  {
    id: 'module-10',
    title: 'Final Project',
    description: 'Build a profile page, a portfolio, and pass the final assessment.',
    lessonIds: ['profile-page', 'portfolio-page', 'final-challenge', 'course-assessment'],
  },
]

export const htmlFundamentalsCourse = {
  id: 'html-fundamentals',
  title: 'HTML Fundamentals',
  description: 'Learn the language of the web from your first tag to a complete, accessible page — with interactive lessons, live code, practice and quizzes.',
  shortDescription: 'Structure real web pages with semantic, accessible HTML.',
  language: 'HTML',
  difficulty: 'Beginner',
  icon: 'HTML5',
  color: '#e34f26',
  estimatedMinutes: lessons.reduce((total, item) => total + (item.duration || 0), 0),
  outcomes: [
    'Write a valid, complete HTML document from scratch',
    'Structure content with headings, lists, links, tables and forms',
    'Build accessible pages with semantic elements and alt text',
    'Ship a personal profile page and a portfolio page',
  ],
  modules,
  lessons,
  // The final lesson requires a 70% quiz score to complete the course.
  completion: { requiredQuizScore: 60, assessmentLessonId: 'course-assessment', assessmentScore: 70 },
}

export default htmlFundamentalsCourse
