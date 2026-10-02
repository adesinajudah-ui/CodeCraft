import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase } from './lib/supabase'
import './challenge-admin.css'

const blankChallenge = () => ({
  id: '', title: '', slug: '', description: '', instructions: '', category: 'General',
  difficulty: 'Beginner', language: 'javascript', starter_code: '', xp_reward: 100,
  position: 0, published: false, prerequisite_challenge_id: '', examples: '[]',
  requirements: '[]', official_solution: '',
})
const navSections = [
  ['overview', 'Dashboard'], ['users', 'Users'], ['community', 'Community'], ['reports', 'Reports'],
  ['projects', 'Projects'], ['learn', 'Learn'], ['challenges', 'Challenges'], ['quizzes', 'Quizzes'],
  ['certificates', 'Certificates'], ['announcements', 'Announcements'], ['analytics', 'Analytics'],
  ['activity', 'Activity Log'], ['settings', 'Settings'],
]

function asJson(value, fallback, field) {
  try {
    const parsed = JSON.parse(value || '')
    if (!Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    throw new Error(`${field} must be a valid JSON array.`)
  }
}

export default function AdminChallengeManagement({ onNavigate }) {
  const { user } = useUser()
  const [view, setView] = useState('manage')
  const [challenges, setChallenges] = useState([])
  const [testCases, setTestCases] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState(blankChallenge())
  const [editingCases, setEditingCases] = useState([])
  const [preview, setPreview] = useState(null)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [publishFilter, setPublishFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submissionScores, setSubmissionScores] = useState({})
  const [reviewMigrationRequired, setReviewMigrationRequired] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    const loadSubmissionRows = async () => {
      const reviewFields = await supabase.from('challenge_submissions')
        .select('id,challenge_id,clerk_user_id,submitted_code,language,status,passed,score,review_score,review_decision,passed_test_cases,total_test_cases,execution_time_ms,memory_kb,submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(500)

      if (!reviewFields.error) return { ...reviewFields, migrationRequired: false }
      if (!/review_score|review_decision|schema cache/i.test(reviewFields.error.message || '')) {
        return { ...reviewFields, migrationRequired: false }
      }

      const legacyFields = await supabase.from('challenge_submissions')
        .select('id,challenge_id,clerk_user_id,submitted_code,language,status,passed,score,passed_test_cases,total_test_cases,execution_time_ms,memory_kb,submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(500)

      return {
        ...legacyFields,
        data: (legacyFields.data || []).map((submission) => ({
          ...submission,
          review_score: null,
          review_decision: 'pending',
        })),
        migrationRequired: true,
      }
    }

    const [challengeResult, caseResult, submissionResult, profileResult] = await Promise.all([
      supabase.from('challenges').select('*').order('position').order('created_at', { ascending: false }),
      supabase.from('challenge_test_cases').select('*').order('position'),
      loadSubmissionRows(),
      supabase.from('profiles').select('clerk_user_id,username'),
    ])
    const failures = [
      ['challenges', challengeResult.error],
      ['challenge test cases', caseResult.error],
      ['challenge submissions', submissionResult.error],
      ['profiles', profileResult.error],
    ].filter(([, requestError]) => requestError)
    if (failures.length) {
      setError(failures.map(([table, requestError]) => `Could not load ${table}: ${requestError.message}`).join(' '))
    }
    setChallenges(challengeResult.data || [])
    setTestCases(caseResult.data || [])
    setSubmissions(submissionResult.data || [])
    setProfiles(profileResult.data || [])
    setReviewMigrationRequired(Boolean(submissionResult.migrationRequired))
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  const writeAudit = async (action, type, target, details = {}) => {
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_clerk_user_id: user.id,
      action,
      target_type: type,
      target_id: String(target || ''),
      details,
    })
    if (auditError) throw auditError
  }

  const runAction = async (callback) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await callback()
      await load()
    } catch (actionError) {
      setError(actionError.message || 'The challenge action could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setForm(blankChallenge())
    setEditingCases([])
    setView('edit')
  }

  const openEdit = async (challenge) => {
    setError('')
    const [{ data: privateData, error: privateError }, { data: cases, error: casesError }] = await Promise.all([
      supabase.from('challenge_private_data').select('expected_solution').eq('challenge_id', challenge.id).maybeSingle(),
      supabase.from('challenge_test_cases').select('*').eq('challenge_id', challenge.id).order('position'),
    ])
    if (privateError || casesError) {
      setError('Challenge details could not be loaded for editing.')
      return
    }
    setForm({
      ...challenge,
      prerequisite_challenge_id: challenge.prerequisite_challenge_id || '',
      examples: JSON.stringify(challenge.examples || [], null, 2),
      requirements: JSON.stringify(challenge.requirements || [], null, 2),
      official_solution: privateData?.expected_solution || '',
    })
    setEditingCases(cases || [])
    setView('edit')
  }

  const saveChallenge = () => runAction(async () => {
    const title = form.title.trim()
    const xpReward = Number(form.xp_reward)
    if (!title) throw new Error('Challenge title is required.')
    if (!form.description.trim() || !form.instructions.trim()) throw new Error('Description and instructions are required.')
    if (!['javascript', 'python', 'c++'].includes(form.language)) throw new Error('Choose a supported language: JavaScript, Python, or C++.')
    if (!Number.isInteger(xpReward) || xpReward < 1 || xpReward > 10000) throw new Error('XP reward must be between 1 and 10,000.')
    if (form.published && !editingCases.some((testCase) => Boolean(testCase.id))) throw new Error('Save at least one test case before publishing this challenge.')
    const payload = {
      slug: (form.slug || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title,
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      category: form.category.trim() || 'General',
      difficulty: form.difficulty,
      language: form.language,
      starter_code: form.starter_code || '',
      xp_reward: xpReward,
      position: Number(form.position || 0),
      published: Boolean(form.published),
      prerequisite_challenge_id: form.prerequisite_challenge_id || null,
      examples: asJson(form.examples, [], 'Examples'),
      requirements: asJson(form.requirements, [], 'Requirements'),
    }
    const saved = form.id
      ? await supabase.from('challenges').update(payload).eq('id', form.id).select('id').single()
      : await supabase.from('challenges').insert({ ...payload, created_by: user.id }).select('id').single()
    if (saved.error) throw new Error('Could not save this challenge. Check the slug and required fields.')
    const privateResult = await supabase.from('challenge_private_data').upsert({ challenge_id: saved.data.id, expected_solution: form.official_solution.trim() || null, validation_data: {} }, { onConflict: 'challenge_id' })
    if (privateResult.error) throw new Error('Challenge saved, but its private solution could not be saved.')
    await writeAudit(form.id ? 'challenge_updated' : 'challenge_created', 'challenge', saved.data.id, { title })
    setMessage('Challenge saved. Save each test case below before publishing.')
    setForm((old) => ({ ...old, id: saved.data.id }))
  })

  const saveTestCase = (testCase, index) => runAction(async () => {
    if (!form.id) throw new Error('Save the challenge before adding test cases.')
    if (!testCase.expected_output.trim()) throw new Error('Expected output is required for each test case.')
    const payload = { challenge_id: form.id, input: testCase.input || '', expected_output: testCase.expected_output, is_hidden: Boolean(testCase.is_hidden), position: index }
    const result = testCase.id
      ? await supabase.from('challenge_test_cases').update(payload).eq('id', testCase.id)
      : await supabase.from('challenge_test_cases').insert(payload)
    if (result.error) throw new Error('Could not save this test case.')
    await writeAudit(testCase.id ? 'challenge_test_case_updated' : 'challenge_test_case_created', 'challenge_test_case', testCase.id || form.id)
    const { data } = await supabase.from('challenge_test_cases').select('*').eq('challenge_id', form.id).order('position')
    setEditingCases(data || [])
    setMessage('Test case saved.')
  })

  const deleteTestCase = (testCase) => runAction(async () => {
    if (testCase.id) {
      const result = await supabase.from('challenge_test_cases').delete().eq('id', testCase.id)
      if (result.error) throw new Error('Could not delete this test case.')
      await writeAudit('challenge_test_case_deleted', 'challenge_test_case', testCase.id)
    }
    setEditingCases((old) => old.filter((item) => item !== testCase))
  })

  const deleteChallenge = (challenge) => runAction(async () => {
    if (!window.confirm(`Delete “${challenge.title}”? Its tests and submissions will be removed. Awarded XP history is retained.`)) return
    const result = await supabase.from('challenges').delete().eq('id', challenge.id)
    if (result.error) throw new Error('Could not delete this challenge. Check references and retry.')
    await writeAudit('challenge_deleted', 'challenge', challenge.id, { title: challenge.title })
    if (form.id === challenge.id) setView('manage')
  })

  const togglePublish = (challenge) => runAction(async () => {
    const hasTests = testCases.some((testCase) => testCase.challenge_id === challenge.id)
    if (!challenge.published && !hasTests) throw new Error('Add at least one test case before publishing.')
    const result = await supabase.from('challenges').update({ published: !challenge.published }).eq('id', challenge.id)
    if (result.error) throw new Error('Could not update challenge visibility.')
    await writeAudit('challenge_publish_changed', 'challenge', challenge.id, { published: !challenge.published })
  })

  const reviewSubmission = (submission, decision) => runAction(async () => {
    const rawScore = submissionScores[submission.id] ?? submission.review_score ?? submission.score ?? 0
    const score = Number(rawScore)
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new Error('Enter a whole-number score between 0 and 100 before reviewing.')
    }

    const { error: reviewError } = await supabase.rpc('review_codecraft_challenge_submission', {
      p_submission_id: submission.id,
      p_decision: decision,
      p_score: score,
    })
    if (reviewError) throw new Error(reviewError.message || 'Could not save this review.')
    await writeAudit('challenge_submission_reviewed', 'challenge_submission', submission.id, { decision, score })
    setMessage(`Challenge ${decision} with a score of ${score}%.`)
  })

  const filteredChallenges = challenges.filter((challenge) => {
    const queryMatches = `${challenge.title} ${challenge.description} ${challenge.language} ${challenge.category}`.toLowerCase().includes(query.trim().toLowerCase())
    const difficultyMatches = difficulty === 'All' || challenge.difficulty === difficulty
    const statusMatches = publishFilter === 'All' || (publishFilter === 'Published' ? challenge.published : !challenge.published)
    return queryMatches && difficultyMatches && statusMatches
  })
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
  const profileById = new Map(profiles.map((profile) => [profile.clerk_user_id, profile]))

  return <div className="admin-challenge-management"><header className="admin-challenge-heading"><div><span className="section-kicker">CHALLENGE OPERATIONS</span><h2>{view === 'edit' ? form.id ? 'Edit Challenge' : 'Create Challenge' : view === 'submissions' ? 'Challenge Submissions' : view === 'preview' ? 'Challenge Preview' : 'Manage Challenges'}</h2></div><div className="admin-row-actions"><button type="button" onClick={() => { setView('manage'); setForm(blankChallenge()) }}>Manage Challenges</button><button type="button" onClick={() => setView('submissions')}>Submissions</button><button type="button" className="button button-small" onClick={openCreate}>Create Challenge</button></div></header>{error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="challenge-admin-message" role="status">{message}</p>}
    {view === 'manage' && <section className="admin-panel"><div className="challenge-admin-filters"><label className="admin-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, category, language..." /></label><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{['All', 'Beginner', 'Intermediate', 'Advanced'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value)}>{['All', 'Published', 'Draft'].map((value) => <option key={value}>{value}</option>)}</select></label></div>{loading ? <p className="admin-empty-state">Loading challenges…</p> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Challenge</th><th>Difficulty</th><th>Language</th><th>XP</th><th>Tests</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{filteredChallenges.map((challenge) => <tr key={challenge.id}><td><strong>{challenge.title}</strong><small>{challenge.category}</small></td><td>{challenge.difficulty}</td><td>{challenge.language}</td><td>{challenge.xp_reward}</td><td>{testCases.filter((entry) => entry.challenge_id === challenge.id).length}</td><td>{challenge.published ? 'Published' : 'Draft'}</td><td>{new Date(challenge.created_at).toLocaleDateString()}</td><td className="admin-row-actions"><button type="button" onClick={() => openEdit(challenge)}>Edit</button><button type="button" onClick={() => { setPreview(challenge); setView('preview') }}>Preview</button><button type="button" onClick={() => togglePublish(challenge)} disabled={saving}>{challenge.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteChallenge(challenge)} disabled={saving}>Delete</button></td></tr>)}</tbody></table>{!filteredChallenges.length && <p className="admin-empty-state">No challenges match these filters.</p>}</div>}</section>}
    {view === 'edit' && <section className="admin-panel"><div className="challenge-admin-form-grid"><label>Title<input value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} /></label><label>Slug<input value={form.slug || ''} onChange={(event) => setForm((old) => ({ ...old, slug: event.target.value }))} placeholder="generated-from-title" /></label><label>Category<input value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} /></label><label>Difficulty<select value={form.difficulty} onChange={(event) => setForm((old) => ({ ...old, difficulty: event.target.value }))}>{['Beginner', 'Intermediate', 'Advanced'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Language<select value={form.language} onChange={(event) => setForm((old) => ({ ...old, language: event.target.value }))}><option value="javascript">JavaScript (Node.js)</option><option value="python">Python 3</option><option value="c++">C++</option></select></label><label>XP Reward<input type="number" min="1" max="10000" value={form.xp_reward} onChange={(event) => setForm((old) => ({ ...old, xp_reward: event.target.value }))} /></label><label>Order<input type="number" value={form.position} onChange={(event) => setForm((old) => ({ ...old, position: event.target.value }))} /></label><label>Requires challenge<select value={form.prerequisite_challenge_id || ''} onChange={(event) => setForm((old) => ({ ...old, prerequisite_challenge_id: event.target.value }))}><option value="">No prerequisite</option>{challenges.filter((challenge) => challenge.id !== form.id).map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}</select></label><label className="admin-checkbox-field"><input type="checkbox" checked={Boolean(form.published)} onChange={(event) => setForm((old) => ({ ...old, published: event.target.checked }))} /> Published</label><label className="challenge-admin-wide">Description<textarea rows={3} value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} /></label><label className="challenge-admin-wide">Instructions<textarea rows={5} value={form.instructions} onChange={(event) => setForm((old) => ({ ...old, instructions: event.target.value }))} /></label><label className="challenge-admin-wide">Starter Code<textarea rows={6} value={form.starter_code} onChange={(event) => setForm((old) => ({ ...old, starter_code: event.target.value }))} /></label><label>Requirements JSON<textarea rows={5} value={form.requirements} onChange={(event) => setForm((old) => ({ ...old, requirements: event.target.value }))} /></label><label>Examples JSON<textarea rows={5} value={form.examples} onChange={(event) => setForm((old) => ({ ...old, examples: event.target.value }))} /></label><label className="challenge-admin-wide">Official Solution (private until completion)<textarea rows={7} value={form.official_solution} onChange={(event) => setForm((old) => ({ ...old, official_solution: event.target.value }))} /></label></div><div className="admin-row-actions challenge-admin-form-actions"><button type="button" className="button button-small" onClick={saveChallenge} disabled={saving}>{saving ? 'Saving challenge…' : 'Save Challenge'}</button><button type="button" onClick={() => { setForm(blankChallenge()); setView('manage') }}>Cancel</button></div>{form.id && <section className="challenge-test-case-editor"><header className="admin-panel-heading"><h3>Test Cases</h3><button type="button" onClick={() => setEditingCases((old) => [...old, { id: '', input: '', expected_output: '', is_hidden: false, position: old.length }])}>Add Test Case</button></header>{editingCases.map((testCase, index) => <div className="challenge-test-case-row" key={testCase.id || `new-${index}`}><label>Input<textarea rows={3} value={testCase.input} onChange={(event) => setEditingCases((old) => old.map((item, itemIndex) => itemIndex === index ? { ...item, input: event.target.value } : item))} /></label><label>Expected Output<textarea rows={3} value={testCase.expected_output} onChange={(event) => setEditingCases((old) => old.map((item, itemIndex) => itemIndex === index ? { ...item, expected_output: event.target.value } : item))} /></label><label className="admin-checkbox-field"><input type="checkbox" checked={Boolean(testCase.is_hidden)} onChange={(event) => setEditingCases((old) => old.map((item, itemIndex) => itemIndex === index ? { ...item, is_hidden: event.target.checked } : item))} /> Hidden</label><div className="admin-row-actions"><button type="button" onClick={() => saveTestCase(testCase, index)} disabled={saving}>Save Test</button><button type="button" className="danger" onClick={() => deleteTestCase(testCase)} disabled={saving}>Delete Test</button></div></div>)}{!editingCases.length && <p className="admin-empty-state">No tests yet. Add at least one before publishing.</p>}</section>}</section>}
    {view === 'preview' && preview && <section className="admin-panel challenge-preview-panel"><div className="admin-row-actions"><button type="button" onClick={() => setView('manage')}>Back to Challenges</button><button type="button" onClick={() => openEdit(preview)}>Edit Challenge</button></div><div className="challenge-preview-meta"><span>{preview.difficulty}</span><span>{preview.language}</span><span>{preview.xp_reward} XP</span><span>{preview.published ? 'Published' : 'Draft'}</span></div><h3>{preview.title}</h3><p>{preview.description}</p><h4>Instructions</h4><p>{preview.instructions}</p><pre>{preview.starter_code}</pre><h4>Tests (admin preview)</h4>{testCases.filter((entry) => entry.challenge_id === preview.id).map((entry, index) => <div className="challenge-test-preview" key={entry.id}><strong>Test {index + 1}{entry.is_hidden ? ' · Hidden' : ' · Public'}</strong><pre>Input: {entry.input}{'\n'}Expected: {entry.expected_output}</pre></div>)}</section>}
    {view === 'submissions' && <section className="admin-panel"><header className="admin-panel-heading"><h3>Challenge Submissions</h3><span>Showing the most recent 500 persisted submissions.</span></header>{reviewMigrationRequired && <p className="admin-error" role="alert">Accept/Decline needs Supabase migration 010. Apply supabase/migrations/010_admin_challenge_submission_reviews.sql to the connected project.</p>}{loading ? <p className="admin-empty-state">Loading submissions…</p> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>User</th><th>Challenge</th><th>Status</th><th>Score</th><th>Language</th><th>Execution</th><th>Submitted</th><th>Code</th><th>Decision</th></tr></thead><tbody>{submissions.map((submission) => { const alreadyReviewed = submission.review_decision && submission.review_decision !== 'pending'; return <tr key={submission.id}><td>{profileById.get(submission.clerk_user_id)?.username || submission.clerk_user_id}</td><td>{challengeById.get(submission.challenge_id)?.title || 'Deleted challenge'}</td><td>{submission.status}</td><td><label className="challenge-admin-score"><span className="sr-only">Review score</span><input type="number" min="0" max="100" step="1" value={submissionScores[submission.id] ?? submission.review_score ?? submission.score ?? 0} onChange={(event) => setSubmissionScores((old) => ({ ...old, [submission.id]: event.target.value }))} disabled={reviewMigrationRequired || alreadyReviewed} />% <small>({submission.passed_test_cases}/{submission.total_test_cases})</small></label></td><td>{submission.language || '—'}</td><td>{submission.execution_time_ms ?? '—'} ms · {submission.memory_kb ?? '—'} KB</td><td>{new Date(submission.submitted_at).toLocaleString()}</td><td><details><summary>Inspect</summary><pre className="submission-code">{submission.submitted_code}</pre></details></td><td><div className="challenge-admin-review-actions"><span>{submission.review_decision || 'Pending'}</span><button type="button" onClick={() => reviewSubmission(submission, 'accepted')} disabled={saving || reviewMigrationRequired || alreadyReviewed}>{saving ? 'Saving…' : 'Accept'}</button><button type="button" className="danger" onClick={() => reviewSubmission(submission, 'declined')} disabled={saving || reviewMigrationRequired || alreadyReviewed}>{saving ? 'Saving…' : 'Decline'}</button></div></td></tr> })}</tbody></table>{!submissions.length && <p className="admin-empty-state">No submissions have been received.</p>}</div>}</section>}
  </div>
}
