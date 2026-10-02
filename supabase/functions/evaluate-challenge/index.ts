import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const languageIds: Record<string, number> = {
  javascript: 63,
  python: 71,
  'c++': 54,
}

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function serviceHeaders() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Challenge evaluator database configuration is missing.')
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } }
}

async function supabaseSelect<T>(path: string): Promise<T> {
  const { url, headers } = serviceHeaders()
  const response = await fetch(`${url}/rest/v1/${path}`, { headers })
  if (!response.ok) throw new Error('Could not load challenge data.')
  return await response.json() as T
}

function normalizeLanguage(language: string) {
  const value = language.trim().toLowerCase()
  if (value === 'js' || value === 'node' || value === 'node.js') return 'javascript'
  if (value === 'python 3') return 'python'
  if (value === 'cpp' || value === 'c plus plus') return 'c++'
  return value
}

async function verifyClerkUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const jwksUrl = Deno.env.get('CLERK_JWKS_URL')
  const issuer = Deno.env.get('CLERK_ISSUER')
  if (!token || !jwksUrl || !issuer) throw new Error('Authentication or Clerk verification configuration is missing.')

  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(jwksUrl))
  const { payload } = await jwtVerify(token, remoteJwks, { issuer })
  if (typeof payload.sub !== 'string' || !payload.sub.startsWith('user_')) {
    throw new Error('The Clerk token does not identify a user.')
  }
  return payload.sub
}

async function ensureAccountActive(clerkUserId: string) {
  const statuses = await supabaseSelect<Array<{ status: string }>>(
    `user_account_status?clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&select=status&limit=1`,
  )
  if (statuses[0] && ['suspended', 'banned'].includes(statuses[0].status)) {
    throw new Error('Account access is paused.')
  }
}

async function loadChallenge(challengeId: string, clerkUserId: string) {
  const rows = await supabaseSelect<Array<{ id: string; title: string; language: string; published: boolean; prerequisite_challenge_id: string | null }>>(
    `challenges?id=eq.${encodeURIComponent(challengeId)}&select=id,title,language,published,prerequisite_challenge_id&limit=1`,
  )
  if (!rows[0] || !rows[0].published) throw new Error('Challenge not found or unavailable.')
  if (rows[0].prerequisite_challenge_id) {
    const completions = await supabaseSelect<Array<{ id: string }>>(
      `challenge_completions?challenge_id=eq.${encodeURIComponent(rows[0].prerequisite_challenge_id)}&clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&select=id&limit=1`,
    )
    if (!completions.length) throw new Error('Complete the prerequisite challenge before starting this one.')
  }
  return rows[0]
}

async function judge(sourceCode: string, language: string, input = '') {
  const baseUrl = Deno.env.get('JUDGE0_API_URL')
  if (!baseUrl) throw new Error('Code execution is not configured. Ask the CodeCraft administrator to configure the Judge0 service.')
  const languageId = languageIds[normalizeLanguage(language)]
  if (!languageId) throw new Error('This challenge language is not supported by the configured runner.')

  const url = new URL('/submissions', baseUrl)
  url.searchParams.set('base64_encoded', 'false')
  url.searchParams.set('wait', 'true')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = Deno.env.get('JUDGE0_API_KEY')
  const apiHost = Deno.env.get('JUDGE0_API_HOST')
  if (apiKey) headers['X-RapidAPI-Key'] = apiKey
  if (apiHost) headers['X-RapidAPI-Host'] = apiHost

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: 3,
      wall_time_limit: 8,
      memory_limit: 128000,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('The code runner is temporarily unavailable. Please try again.')
  const result = await response.json()
  return {
    accepted: result.status?.id === 3,
    output: result.stdout || '',
    error: result.stderr || result.compile_output || result.message || '',
    status: result.status?.description || 'Unknown',
    time: result.time ? Math.ceil(Number(result.time) * 1000) : null,
    memory: Number.isFinite(result.memory) ? Number(result.memory) : null,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const clerkUserId = await verifyClerkUser(request)
    await ensureAccountActive(clerkUserId)
    const body = await request.json()
    const { challengeId, mode, sourceCode } = body
    if (typeof challengeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(challengeId)) return jsonResponse({ error: 'Select a valid challenge.' }, 400)
    if (typeof sourceCode !== 'string' || !sourceCode.trim() || sourceCode.length > 50000) return jsonResponse({ error: 'Enter code under 50,000 characters.' }, 400)
    if (!['run', 'submit'].includes(mode)) return jsonResponse({ error: 'Unsupported challenge operation.' }, 400)

    const challenge = await loadChallenge(challengeId, clerkUserId)
    const language = normalizeLanguage(challenge.language)

    if (mode === 'run') {
      const execution = await judge(sourceCode, language, typeof body.input === 'string' ? body.input.slice(0, 10000) : '')
      return jsonResponse({
        accepted: execution.accepted,
        output: execution.output,
        error: execution.error,
        status: execution.status,
        execution_time_ms: execution.time,
        memory_kb: execution.memory,
      })
    }

    const testCases = await supabaseSelect<Array<{ id: string; input: string; expected_output: string; is_hidden: boolean; position: number }>>(
      `challenge_test_cases?challenge_id=eq.${encodeURIComponent(challengeId)}&select=id,input,expected_output,is_hidden,position&order=position.asc`,
    )
    if (!testCases.length || testCases.length > 30) return jsonResponse({ error: 'This challenge is not configured with a valid test suite.' }, 409)

    let passedCases = 0
    let totalTime = 0
    let maxMemory = 0
    const failedPublicCases: Array<{ position: number; expected: string; actual: string; error: string }> = []
    for (const [index, testCase] of testCases.entries()) {
      const execution = await judge(sourceCode, language, testCase.input.slice(0, 10000))
      totalTime += execution.time || 0
      maxMemory = Math.max(maxMemory, execution.memory || 0)
      const passed = execution.accepted && execution.output.trim() === testCase.expected_output.trim()
      if (passed) passedCases += 1
      else if (!testCase.is_hidden) {
        failedPublicCases.push({
          position: index + 1,
          expected: testCase.expected_output.slice(0, 500),
          actual: execution.output.slice(0, 500),
          error: execution.error.slice(0, 500),
        })
      }
    }

    const score = Math.floor((passedCases / testCases.length) * 100)
    const passed = passedCases === testCases.length
    const resultSummary = {
      failed_public_cases: failedPublicCases,
      hidden_failures: testCases.some((testCase) => testCase.is_hidden) && !passed,
    }
    const { url, headers } = serviceHeaders()
    const resultResponse = await fetch(`${url}/rest/v1/rpc/record_challenge_evaluation`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_clerk_user_id: clerkUserId,
        p_challenge_id: challengeId,
        p_code: sourceCode,
        p_language: language,
        p_passed: passed,
        p_score: score,
        p_passed_test_cases: passedCases,
        p_total_test_cases: testCases.length,
        p_execution_time_ms: totalTime,
        p_memory_kb: maxMemory,
        p_result_summary: resultSummary,
      }),
    })
    if (!resultResponse.ok) throw new Error('Could not save the evaluation result.')
    const saved = await resultResponse.json()
    return jsonResponse({ ...saved, summary: resultSummary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Challenge request failed.'
    const status = message.includes('token') || message.includes('Authentication') ? 401
      : message.includes('paused') ? 403
      : message.includes('unavailable') ? 404
      : message.includes('not configured') || message.includes('not supported') ? 503
      : 400
    return jsonResponse({ error: message }, status)
  }
})
