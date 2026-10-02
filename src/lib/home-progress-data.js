// Home dashboard fetcher (I/O layer). Pure builders live in ./home-progress.
// Per-source error isolation: one failing source never blanks the dashboard (spec §34).

import { supabase, hasSupabaseConfig } from './supabase'

export async function fetchHomeDashboard(clerkUserId) {
  if (!clerkUserId || !hasSupabaseConfig) {
    return {
      courses: [],
      lessons: [],
      lessonProgress: [],
      quizAttempts: [],
      quizzes: [],
      challengeCompletions: [],
      certificates: [],
      progressRow: null,
      errors: { config: !hasSupabaseConfig },
    }
  }

  async function fetchPart(label, run) {
    try {
      const { data, error } = await run
      if (error) throw error
      return { data: data ?? null, error: null }
    } catch (error) {
      console.error(`Home dashboard: failed to load ${label}:`, error)
      return { data: null, error }
    }
  }

  const [
    coursesPart,
    lessonsPart,
    lessonProgressPart,
    quizAttemptsPart,
    quizzesPart,
    challengeCompletionsPart,
    certificatesPart,
    progressRowPart,
  ] = await Promise.all([
    fetchPart('course catalog', () => supabase.from('courses').select('id,title,description,category,difficulty,icon,position').eq('published', true).order('position')),
    fetchPart('lessons', () => supabase.from('lessons').select('id,course_id,title,content,position').eq('published', true).order('position')),
    fetchPart('lesson progress', () => supabase.from('lesson_progress').select('lesson_id,course_id,first_opened_at,last_viewed_at,completed_at').eq('clerk_user_id', clerkUserId)),
    fetchPart('quiz attempts', () => supabase.from('quiz_attempts').select('id,quiz_id,status,percentage,xp_earned,submitted_at,score,total_questions').eq('clerk_user_id', clerkUserId).order('submitted_at', { ascending: false })),
    fetchPart('quiz titles', () => supabase.from('quizzes').select('id,title')),
    fetchPart('challenge completions', () => supabase.from('challenge_completions').select('id,challenge_id,challenge_title,xp_awarded,score,completed_at').eq('clerk_user_id', clerkUserId).order('completed_at', { ascending: false })),
    fetchPart('certificates', () => supabase.from('certificates').select('id,title,issued_at').eq('clerk_user_id', clerkUserId)),
    fetchPart('xp progress', () => supabase.from('challenge_progress').select('xp,level,completed_challenges').eq('clerk_user_id', clerkUserId).maybeSingle()),
  ])

  return {
    courses: coursesPart.data || [],
    lessons: lessonsPart.data || [],
    lessonProgress: lessonProgressPart.data || [],
    quizAttempts: quizAttemptsPart.data || [],
    quizzes: quizzesPart.data || [],
    challengeCompletions: challengeCompletionsPart.data || [],
    certificates: certificatesPart.data || [],
    progressRow: progressRowPart.data || null,
    errors: {
      courses: coursesPart.error,
      lessons: lessonsPart.error,
      lessonProgress: lessonProgressPart.error,
      quizAttempts: quizAttemptsPart.error,
      quizzes: quizzesPart.error,
      challengeCompletions: challengeCompletionsPart.error,
      certificates: certificatesPart.error,
      progressRow: progressRowPart.error,
    },
  }
}
