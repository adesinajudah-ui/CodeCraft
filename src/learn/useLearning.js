import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  computeCourseProgress,
  computeSummary,
  getLessonState,
  getSnapshot,
  isLessonUnlocked,
  loadForUser,
  subscribe,
} from './progress.js'
import { listEngineCourses } from '../courses/index.js'

// Shared progress store bound to the signed-in Clerk user (falls back to a
// device-local "guest" profile when signed out).
export function useLearning() {
  const { user } = useUser()
  const userId = user?.id || null

  useEffect(() => {
    let cancelled = false
    loadForUser(userId).then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [userId])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return { userId, state }
}

export function useCourseProgress(course) {
  const { userId, state } = useLearning()
  return useMemo(() => ({
    userId,
    state,
    progress: computeCourseProgress(course, state),
    summary: computeSummary(state, listEngineCourses()),
  }), [userId, state, course])
}

export function useLessonState(course, lessonId) {
  const { state } = useLearning()
  return getLessonState(state, course.id, lessonId)
}

export function useLessonUnlock(course, lessonId) {
  const { state } = useLearning()
  return isLessonUnlocked(course, lessonId, state)
}

export function useMediaQuery(query) {
  const subscribeToQuery = useCallback((callback) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const list = window.matchMedia(query)
    list.addEventListener?.('change', callback)
    return () => list.removeEventListener?.('change', callback)
  }, [query])

  const getMatches = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribeToQuery, getMatches, () => false)
}

export const useIsDesktopWorkspace = () => useMediaQuery('(min-width: 1024px)')

export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
