// Supabase side of the learning-progress layer.
// Requires migration 020_learning_engine.sql. Every function degrades to a
// no-op when Supabase is not configured or the migration has not been applied,
// so the app never depends on the remote being available.

import { supabase, hasSupabaseConfig } from '../lib/supabase.js'
import { GLOBAL_SCOPE } from './progress.js'

const canSync = (userId) => Boolean(hasSupabaseConfig && userId && userId !== 'guest')

let flushTimer = null
let queued = null

function schedulePush(userId, state) {
  queued = { userId, state }
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    const job = queued
    queued = null
    flushTimer = null
    if (job) send(job.userId, job.state).catch(() => {})
  }, 1200)
}

async function send(userId, state) {
  const rows = [{
    clerk_user_id: userId,
    scope: GLOBAL_SCOPE,
    state: { points: state.points, badges: state.badges, activeDays: state.activeDays },
    updated_at: new Date().toISOString(),
  }]

  for (const [courseId, courseState] of Object.entries(state.courses || {})) {
    rows.push({ clerk_user_id: userId, scope: courseId, state: courseState, updated_at: courseState.updatedAt || new Date().toISOString() })
  }

  const { error } = await supabase.from('learning_progress').upsert(rows, { onConflict: 'clerk_user_id,scope' })
  if (error) throw error
  return true
}

export function pushRemoteState(userId, state) {
  if (!canSync(userId) || !state) return Promise.resolve(null)
  try {
    schedulePush(userId, state)
  } catch {
    return Promise.resolve(null)
  }
  return Promise.resolve(true)
}

export async function pullRemoteState(userId) {
  if (!canSync(userId)) return null

  const { data, error } = await supabase
    .from('learning_progress')
    .select('scope,state,updated_at')
    .eq('clerk_user_id', userId)

  if (error || !Array.isArray(data) || data.length === 0) return null

  const merged = {
    version: 1,
    updatedAt: null,
    points: 0,
    badges: [],
    activeDays: [],
    courses: {},
  }

  for (const row of data) {
    const payload = row.state || {}
    if (row.scope === GLOBAL_SCOPE) {
      merged.points = Math.max(0, Number(payload.points) || 0)
      merged.badges = Array.isArray(payload.badges) ? payload.badges : []
      merged.activeDays = Array.isArray(payload.activeDays) ? payload.activeDays : []
      merged.updatedAt = row.updated_at || merged.updatedAt
    } else {
      merged.courses[row.scope] = payload
    }
  }

  return merged
}

// Adds learning points to the shared XP ledger through a server-validated
// RPC (clients cannot write challenge_progress directly).
export async function awardLearningPoints(userId, points, reason = 'learning') {
  const amount = Math.round(Number(points) || 0)
  if (!canSync(userId) || amount <= 0) return null

  const { data, error } = await supabase.rpc('award_codecraft_learning_points', {
    p_points: Math.min(500, amount),
    p_reason: reason,
  })

  if (error) {
    console.warn('XP award failed:', error.message)
    return null
  }
  return data
}

// Server-validated certificate issue (see migration 020). The RPC checks the
// stored course progress before inserting into the existing `certificates`
// table, which the Certificates page already reads.
export async function issueLearningCertificate(userId, course) {
  if (!canSync(userId)) return { ok: false, reason: 'not-configured' }

  const { data, error } = await supabase.rpc('issue_codecraft_learning_certificate', {
    p_course_id: course.id,
    p_course_title: course.title,
  })

  if (error) {
    console.warn('Certificate issue failed:', error.message)
    return { ok: false, reason: 'error', message: error.message }
  }

  return { ok: true, certificate: data }
}
