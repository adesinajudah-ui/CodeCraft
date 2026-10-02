import { useCallback, useEffect, useState } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import CourseSearch from './CourseSearch'
import { isUserAdmin, supabase, uploadStorageFile } from './lib/supabase'
import { NotificationBell } from './NotificationSystem'
import MobileNavigation from './MobileNavigation'
import AdminChallengeManagement from './AdminChallengeManagement'
import QuizBuilder from './QuizBuilder'
import './admin-control-center.css'

const sections = [
  ['overview', 'Dashboard'], ['users', 'Users'], ['community', 'Community'], ['reports', 'Reports'],
  ['projects', 'Projects'], ['learn', 'Learn'], ['challenges', 'Challenges'], ['quizzes', 'Quizzes'],
  ['certificates', 'Certificates'], ['announcements', 'Announcements'], ['analytics', 'Analytics'],
  ['activity', 'Activity Log'], ['settings', 'Settings'],
]
const emptyCounts = { users: null, newUsers: null, posts: null, projects: null, reports: null, challenges: null, quizzes: null, quizAttempts: null, certificates: null, announcements: null }
const today = () => new Date().toISOString().slice(0, 16)

function valueOf(row, key, fallback = '') {
  const value = row?.[key]
  return value === null || value === undefined ? fallback : value
}

function Field({ label, children, className = '' }) {
  return <label className={`admin-field ${className}`}><span>{label}</span>{children}</label>
}

function Empty({ children = 'No records found.' }) {
  return <p className="admin-empty-state">{children}</p>
}

function AdminControlCenter({ setActive }) {
  const { user } = useUser()
  const [section, setSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [rawData, setData] = useState({ users: [], roles: [], statuses: [], submissions: [], attempts: [], posts: [], attachments: [], reports: [], projects: [], courses: [], lessons: [], challenges: [], quizzes: [], questions: [], certificates: [], announcements: [], audit: [], settings: [] })
  const [counts, setCounts] = useState(emptyCounts)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState('')

  const [selectedPost, setSelectedPost] = useState(null)
  const [form, setFormState] = useState(false)
  const [builderQuiz, setBuilderQuiz] = useState(null) // null = list, false = create, { id } = edit
  const setForm = (nextForm) => setFormState((current) => {
    const resolved = typeof nextForm === 'function' ? nextForm(current || {}) : nextForm
    return resolved && Object.keys(resolved).length ? resolved : false
  })
  const mobileNavigationItems = [
    ...sections.map(([id, label]) => ({
      id,
      label,
      isActive: section === id,
      onSelect: () => {
        setSection(id)
        setForm({})
        setQuery('')
      },
    })),
    {
      id: 'back-to-codecraft',
      label: 'Back to CodeCraft',
      onSelect: () => {
        setActive('home')
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      },
    },
  ]
  const [questionForm, setQuestionForm] = useState({ question: '', options: '', correct: '0', explanation: '' })
  const [quizPdfUploading, setQuizPdfUploading] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setAuthorized(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const canManage = await isUserAdmin(user.id)
    setAuthorized(canManage)
    if (!canManage) {
      setLoading(false)
      return
    }
    const requests = [
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('admin_roles').select('clerk_user_id'),
      supabase.from('user_account_status').select('*'),
      supabase.from('challenge_submissions').select('id,clerk_user_id,challenge_id,submitted_at').order('submitted_at', { ascending: false }).limit(2000),
      supabase.from('quiz_attempts').select('id,clerk_user_id,quiz_id,score,total_questions,submitted_at').order('submitted_at', { ascending: false }).limit(2000),
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('post_attachments').select('*').limit(1000),
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('courses').select('*').order('position').limit(500),
      supabase.from('lessons').select('*').order('position').limit(1000),
      supabase.from('challenges').select('*').order('position').limit(500),
      supabase.from('quizzes').select('*').order('position').limit(500),
      supabase.from('quiz_questions').select('*').order('position').limit(1000),
      supabase.from('certificates').select('*').order('issued_at', { ascending: false }).limit(500),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('admin_settings').select('*').order('key'),
    ]
    const results = await Promise.all(requests)
    const failed = results.find((result) => result.error)
    if (failed) setError(`Some admin data could not be loaded: ${failed.error.message}`)
    const keys = ['users', 'roles', 'statuses', 'submissions', 'attempts', 'posts', 'attachments', 'reports', 'projects', 'courses', 'lessons', 'challenges', 'quizzes', 'questions', 'certificates', 'announcements', 'audit', 'settings']
    setData(Object.fromEntries(keys.map((key, index) => [key, results[index].data || []])))

    const countTables = ['profiles', 'posts', 'projects', 'reports', 'challenges', 'quizzes', 'quiz_attempts', 'certificates', 'announcements']
    const countResults = await Promise.all(countTables.map((table) => supabase.from(table).select('id', { count: 'exact', head: true })))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const newUsersResult = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', cutoff.toISOString())
    setCounts({
      users: countResults[0].error ? null : countResults[0].count,
      posts: countResults[1].error ? null : countResults[1].count,
      projects: countResults[2].error ? null : countResults[2].count,
      reports: countResults[3].error ? null : countResults[3].count,
      challenges: countResults[4].error ? null : countResults[4].count,
      quizzes: countResults[5].error ? null : countResults[5].count,
      quizAttempts: countResults[6].error ? null : countResults[6].count,
      certificates: countResults[7].error ? null : countResults[7].count,
      announcements: countResults[8].error ? null : countResults[8].count,
      newUsers: newUsersResult.error ? null : newUsersResult.count,
    })
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const writeAudit = async (action, targetType, targetId, details = {}) => {
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_clerk_user_id: user.id, action, target_type: targetType, target_id: String(targetId || ''), details,
    })
    if (auditError) throw auditError
  }

  const runAction = async (action) => {
    setSaving(true)
    setError('')
    try {
      await action()
      await loadData()
    } catch (actionError) {
      setError(actionError.message || 'The action could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  const matching = (rows, fields) => rows.filter((row) => !query.trim() || fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query.trim().toLowerCase())))
  const data = {
    ...rawData,
    courses: matching(rawData.courses, ['title', 'category', 'difficulty']),
    lessons: matching(rawData.lessons, ['title', 'content']),
    challenges: matching(rawData.challenges, ['title', 'description', 'difficulty']),
    quizzes: matching(rawData.quizzes, ['title', 'description']),
    certificates: matching(rawData.certificates, ['title', 'clerk_user_id', 'certificate_code']),
    announcements: matching(rawData.announcements, ['title', 'body']),
  }
  const profileById = new Map(data.users.map((profile) => [profile.clerk_user_id, profile]))
  const roleSet = new Set(data.roles.map((role) => role.clerk_user_id))
  const statusById = new Map(data.statuses.map((status) => [status.clerk_user_id, status]))
  const beginCreate = (values) => setForm({ ...(section === 'quizzes' ? { category: 'General Programming', difficulty: 'Beginner', xp_reward: 100, time_limit_seconds: 300, feedback_mode: 'end', pdf_url: '', pdf_name: '' } : {}), ...values, id: '', published: false })
  const beginEdit = (item) => setForm({ ...item })
  const resetForm = () => setForm(false)
  const editInput = (key, label, options = {}) => {
    const inputProps = { value: valueOf(form, key, options.defaultValue || ''), onChange: (event) => setForm((old) => ({ ...old, [key]: event.target.value })) }
    if (options.type === 'checkbox') return <Field key={key} label={label} className="admin-checkbox-field"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.checked }))} /></Field>
    if (options.type === 'textarea') return <Field key={key} label={label}><textarea {...inputProps} rows={options.rows || 4} /></Field>
    if (options.type === 'select') return <Field key={key} label={label}><select {...inputProps}>{options.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></Field>
    return <><Field key={key} label={label}><input {...inputProps} type={options.type || 'text'} /></Field>{section === 'quizzes' && key === 'title' && <>{editInput('category', 'Category')}{editInput('difficulty', 'Difficulty', { type: 'select', choices: ['Beginner', 'Intermediate', 'Advanced'] })}{editInput('xp_reward', 'XP reward', { type: 'number' })}{editInput('time_limit_seconds', 'Time limit (seconds)', { type: 'number' })}{editInput('feedback_mode', 'Feedback mode', { type: 'select', choices: ['end', 'instant'] })}<Field label="Quiz PDF"><input type="file" accept="application/pdf" onChange={handleQuizPdfUpload} disabled={quizPdfUploading} /><small>{quizPdfUploading ? 'Uploading PDF…' : form.pdf_name || form.pdf_url || 'No PDF uploaded yet'}</small>{form.pdf_url && <a href={form.pdf_url} target="_blank" rel="noreferrer">Open uploaded PDF</a>}</Field></>}</>
  }
  const saveCourse = () => runAction(async () => {
    const payload = { title: form.title?.trim(), description: form.description || '', category: form.category || 'General', difficulty: form.difficulty || 'Beginner', icon: form.icon || 'CC', published: Boolean(form.published), position: Number(form.position || 0), created_by: user.id }
    if (!payload.title) throw new Error('Course title is required.')
    const result = form.id ? await supabase.from('courses').update(payload).eq('id', form.id) : await supabase.from('courses').insert(payload)
    if (result.error) throw result.error
    await writeAudit(form.id ? 'course_updated' : 'course_created', 'course', form.id || payload.title)
    resetForm()
  })
  const saveLesson = () => runAction(async () => {
    const payload = { course_id: form.course_id, title: form.title?.trim(), content: form.content || '', published: Boolean(form.published), position: Number(form.position || 0) }
    if (!payload.course_id || !payload.title) throw new Error('Select a course and enter a lesson title.')
    const result = form.id ? await supabase.from('lessons').update(payload).eq('id', form.id) : await supabase.from('lessons').insert(payload)
    if (result.error) throw result.error
    await writeAudit(form.id ? 'lesson_updated' : 'lesson_created', 'lesson', form.id || payload.title)
    resetForm()
  })
  const saveChallenge = () => runAction(async () => {
    const payload = { title: form.title?.trim(), description: form.description || '', difficulty: form.difficulty || 'Beginner', instructions: form.instructions || '', starter_code: form.starter_code || '', published: Boolean(form.published), position: Number(form.position || 0), created_by: user.id }
    if (!payload.title) throw new Error('Challenge title is required.')
    let result = form.id ? await supabase.from('challenges').update(payload).eq('id', form.id).select('id').single() : await supabase.from('challenges').insert(payload).select('id').single()
    if (result.error) throw result.error
    const privateResult = await supabase.from('challenge_private_data').upsert({ challenge_id: result.data.id, expected_solution: form.expected_solution || null, validation_data: safeJson(form.validation_data) }, { onConflict: 'challenge_id' })
    if (privateResult.error) throw privateResult.error
    await writeAudit(form.id ? 'challenge_updated' : 'challenge_created', 'challenge', result.data.id)
    resetForm()
  })
  const handleQuizPdfUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!user?.id) {
      setError('Sign in to upload the quiz PDF.')
      return
    }

    try {
      setQuizPdfUploading(true)
      setError('')
      const uploadedUrl = await uploadStorageFile({
        bucket: 'quiz-pdfs',
        clerkUserId: user.id,
        file,
        folderName: 'quizzes',
      })

      if (!uploadedUrl) {
        throw new Error('The PDF upload failed. Check your storage bucket settings or paste a direct PDF URL instead.')
      }

      setForm((old) => ({ ...(old || {}), pdf_url: uploadedUrl, pdf_name: file.name }))
    } catch (uploadError) {
      setError(uploadError.message || 'The quiz PDF could not be uploaded.')
    } finally {
      setQuizPdfUploading(false)
      event.target.value = ''
    }
  }

  const createStarterQuizTemplates = async (quizId) => {
    const starterTemplates = [
      {
        question: 'Question text goes here...',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        explanation: 'Add explanation here...',
      },
      {
        question: 'Question text goes here...',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        explanation: 'Add explanation here...',
      },
    ]

    const { data: insertedQuestions, error: insertError } = await supabase.from('quiz_questions').insert(starterTemplates.map((template, index) => ({
      quiz_id: quizId,
      question: template.question,
      options: template.options,
      position: index,
    }))).select('id, question, options, position')

    if (insertError) throw insertError

    const answerKeys = (insertedQuestions || []).map((question, index) => ({
      question_id: question.id,
      correct_answer: starterTemplates[index].correct_answer,
      explanation: starterTemplates[index].explanation,
    }))

    if (answerKeys.length) {
      const { error: answerKeyError } = await supabase.from('quiz_answer_keys').insert(answerKeys)
      if (answerKeyError) throw answerKeyError
    }
  }

  const validateQuizForPublishing = async (quizId) => {
    const { data: questions, error: questionError } = await supabase.from('quiz_questions').select('id,question,options,position').eq('quiz_id', quizId).order('position')
    if (questionError) throw questionError
    if (!questions?.length) {
      throw new Error('Please complete or remove the starter questions before publishing.')
    }

    for (const question of questions) {
      const questionText = String(question.question || '').trim()
      const options = Array.isArray(question.options) ? question.options.map((option) => String(option ?? '').trim()).filter(Boolean) : []
      const { data: answerKeyRow, error: answerKeyError } = await supabase.from('quiz_answer_keys').select('correct_answer, explanation').eq('question_id', question.id).maybeSingle()
      if (answerKeyError) throw answerKeyError

      if (!questionText || /Question text goes here/i.test(questionText)) {
        throw new Error('Please complete or remove the starter questions before publishing.')
      }
      if (options.length < 2) {
        throw new Error('Each published question needs at least two answer options.')
      }
      if (!answerKeyRow || !answerKeyRow.correct_answer || !options.includes(String(answerKeyRow.correct_answer))) {
        throw new Error('Each published question must have a valid correct answer assigned.')
      }
      if (!String(answerKeyRow.explanation || '').trim() || /Add explanation here/i.test(String(answerKeyRow.explanation || ''))) {
        throw new Error('Please complete or remove the starter questions before publishing.')
      }
    }
  }

  const saveQuiz = () => runAction(async () => {
    const shouldPublish = Boolean(form.published)
    const payload = {
      title: form.title?.trim(),
      description: form.description || '',
      category: form.category || 'General Programming',
      difficulty: form.difficulty || 'Beginner',
      xp_reward: Number(form.xp_reward || 100),
      time_limit_seconds: Number(form.time_limit_seconds || 300),
      feedback_mode: form.feedback_mode || 'end',
      pdf_url: form.pdf_url || null,
      pdf_name: form.pdf_name || null,
      published: false,
      position: Number(form.position || 0),
      created_by: user.id,
    }
    if (!payload.title) throw new Error('Quiz title is required.')

    const result = form.id
      ? await supabase.from('quizzes').update(payload).eq('id', form.id).select('id').single()
      : await supabase.from('quizzes').insert(payload).select('id').single()
    if (result.error) throw result.error

    const quizId = result.data.id
    if (!form.id) {
      await createStarterQuizTemplates(quizId)
    }
    if (shouldPublish) {
      await validateQuizForPublishing(quizId)
      const publishResult = await supabase.from('quizzes').update({ published: true }).eq('id', quizId)
      if (publishResult.error) throw publishResult.error
    }

    await writeAudit(form.id ? 'quiz_updated' : 'quiz_created', 'quiz', form.id || quizId)
    resetForm()
  })
  const saveQuestion = () => runAction(async () => {
    if (!selectedQuiz || !questionForm.question.trim()) throw new Error('Choose a quiz and enter a question.')
    if (questionForm.id && !data.questions.some((question) => question.id === questionForm.id && question.quiz_id === selectedQuiz)) {
      throw new Error('This question belongs to a different quiz. Select its original quiz before editing.')
    }
    const options = questionForm.options.split('\n').map((option) => option.trim()).filter(Boolean)
    if (options.length < 2) throw new Error('Add at least two options, one per line.')
    if (!Number.isInteger(Number(questionForm.correct)) || Number(questionForm.correct) < 0 || Number(questionForm.correct) >= options.length) {
      throw new Error('Choose a valid zero-based option number for the correct answer.')
    }
    const questionPayload = { quiz_id: selectedQuiz, question: questionForm.question.trim(), options, position: questionForm.position ?? data.questions.filter((question) => question.quiz_id === selectedQuiz).length }
    const saved = questionForm.id
      ? await supabase.from('quiz_questions').update(questionPayload).eq('id', questionForm.id).select('id').single()
      : await supabase.from('quiz_questions').insert(questionPayload).select('id').single()
    if (saved.error) throw saved.error
    const keyResult = await supabase.from('quiz_answer_keys').upsert({ question_id: saved.data.id, correct_answer: options[Number(questionForm.correct)] ?? options[0], explanation: questionForm.explanation }, { onConflict: 'question_id' })
    if (keyResult.error) throw keyResult.error
    await writeAudit(questionForm.id ? 'quiz_question_updated' : 'quiz_question_created', 'quiz_question', saved.data.id, { quiz_id: selectedQuiz })
    setQuestionForm({ question: '', options: '', correct: '0', explanation: '' })
  })
  const setRole = (target, enabled) => runAction(async () => {
    const result = await supabase.rpc('set_codecraft_admin_role', { p_target_clerk_user_id: target, p_enabled: enabled })
    if (result.error) throw result.error
    await writeAudit(enabled ? 'admin_assigned' : 'admin_removed', 'user', target)
  })
  const setStatus = (target, status) => runAction(async () => {
    const reason = status === 'active' ? null : window.prompt('Reason for this account action:')
    if (status !== 'active' && reason === null) return
    const result = await supabase.rpc('set_codecraft_account_status', { p_target_clerk_user_id: target, p_status: status, p_reason: reason })
    if (result.error) throw result.error
    await writeAudit(status === 'active' ? 'user_restored' : 'user_suspended', 'user', target, { status })
  })
  const updateReport = (report, status) => runAction(async () => {
    const result = await supabase.from('reports').update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', report.id)
    if (result.error) throw result.error
    await writeAudit(`report_${status}`, 'report', report.id)
  })
  const deletePost = (post) => runAction(async () => {
    if (!window.confirm('Delete this community post? The linked CodeCraft project will remain.')) return
    const attachments = data.attachments.filter((attachment) => attachment.post_id === post.id)
    for (const attachment of attachments) {
      const storagePath = storagePathFromUrl(attachment.url, attachment.bucket)
      if (storagePath && attachment.bucket === 'post-images') {
        const removed = await supabase.storage.from(attachment.bucket).remove([storagePath])
        if (removed.error) throw removed.error
      }
    }
    const result = await supabase.from('posts').delete().eq('id', post.id)
    if (result.error) throw result.error
    await writeAudit('post_deleted', 'post', post.id, { attachment_count: attachments.length })
    if (selectedPost?.id === post.id) setSelectedPost(null)
  })
  const deleteRecord = (table, item, actionName) => runAction(async () => {
    if (!window.confirm(`Delete this ${item.title || item.question || item.id}? This cannot be undone.`)) return
    const result = await supabase.from(table).delete().eq('id', item.id)
    if (result.error) throw result.error
    await writeAudit(actionName, table, item.id)
    if (form.id === item.id) resetForm()
  })
  const togglePublished = (table, item, actionName) => runAction(async () => {
    if (table === 'quizzes' && !item.published) {
      await validateQuizForPublishing(item.id)
    }
    const result = await supabase.from(table).update({ published: !item.published }).eq('id', item.id)
    if (result.error) throw result.error
    await writeAudit(actionName, table, item.id, { published: !item.published })
  })
  const createAnnouncement = () => runAction(async () => {
    if (!form.title?.trim() || !form.body?.trim()) throw new Error('Announcement title and message are required.')
    const payload = { title: form.title.trim(), body: form.body.trim(), is_published: Boolean(form.is_published), publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null, audience: form.audience || 'all', created_by_clerk_user_id: user.id }
    const result = form.id ? await supabase.from('announcements').update(payload).eq('id', form.id) : await supabase.from('announcements').insert(payload)
    if (result.error) throw result.error
    await writeAudit(form.id ? 'announcement_updated' : 'announcement_created', 'announcement', form.id || payload.title)
    resetForm()
  })
  const saveSetting = (key, value) => runAction(async () => {
    const result = await supabase.from('admin_settings').upsert({ key, value }, { onConflict: 'key' })
    if (result.error) throw result.error
    await writeAudit('setting_updated', 'setting', key)
  })
  const saveQuizQuestion = (question) => runAction(async () => {
    const result = await supabase.from('quiz_questions').delete().eq('id', question.id)
    if (result.error) throw result.error
    await writeAudit('quiz_question_deleted', 'quiz_question', question.id)
  })
  if (loading && !data.users.length) return <div className="auth-loading">Loading Admin Control Center…</div>
  if (!authorized) return <main className="admin-denied"><div><span className="section-kicker">CODECRAFT OPERATIONS</span><h1>Access denied</h1><p>This Clerk account is not authorized to use the Admin Control Center.</p><button type="button" className="button" onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Return to CodeCraft</button></div></main>

  if (section === 'challenges') {
    return <main className="dashboard-shell admin-shell"><MobileNavigation items={mobileNavigationItems} label="Admin navigation" /><aside className="admin-side"><button className="admin-brand" type="button" onClick={() => { setActive('home'); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>CodeCraft <span>ADMIN</span></button><nav aria-label="Admin navigation">{sections.map(([id, label]) => <button type="button" className={section === id ? 'is-active' : ''} key={id} onClick={() => { setSection(id); setForm(false); setQuery('') }}>{label}</button>)}</nav><button className="admin-back-link" type="button" onClick={() => { setActive('home'); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Back to CodeCraft</button></aside><div className="dashboard-main admin-main"><header className="dashboard-header"><div className="dashboard-search"><span>Admin Control Center</span></div><CourseSearch className="global-header-search" /><div className="profile-actions"><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="admin-content"><AdminChallengeManagement /></div></div></main>
  }

  const countCards = [['Users', counts.users ?? '—'], ['New users · 30 days', counts.newUsers ?? '—'], ['Community posts', counts.posts ?? '—'], ['Projects', counts.projects ?? '—'], ['Reports', counts.reports ?? '—'], ['Challenges', counts.challenges ?? '—'], ['Quizzes', counts.quizzes ?? '—'], ['Quiz attempts', counts.quizAttempts ?? '—'], ['Certificates', counts.certificates ?? '—'], ['Announcements', counts.announcements ?? '—']]
  const settingValue = (key) => data.settings.find((setting) => setting.key === key)?.value

  return <main className="dashboard-shell admin-shell"><MobileNavigation items={mobileNavigationItems} label="Admin navigation" /><aside className="admin-side"><button className="admin-brand" type="button" onClick={() => { setActive('home'); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>CodeCraft <span>ADMIN</span></button><nav aria-label="Admin navigation">{sections.map(([id, label]) => <button type="button" className={section === id ? 'is-active' : ''} key={id} onClick={() => { setSection(id); setForm({}); setQuery('') }}>{label}</button>)}</nav>      <button className="admin-back-link" type="button" onClick={() => { setActive('home'); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Back to CodeCraft</button></aside><div className="dashboard-main admin-main"><header className="dashboard-header"><div className="dashboard-search"><span>Admin Control Center</span></div><CourseSearch className="global-header-search" /><div className="profile-actions"><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="admin-content">
    <div className="admin-page-title"><div><span className="section-kicker">CODECRAFT OPERATIONS</span><h1>{sections.find(([id]) => id === section)?.[1] || 'Dashboard'}</h1></div><div className="admin-title-actions">{['users', 'community', 'reports', 'projects', 'certificates', 'activity', 'overview', 'analytics'].includes(section) ? <label className="admin-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${sections.find(([id]) => id === section)?.[1].toLowerCase()}…`} /></label> : null}<button type="button" className="button button-small" onClick={loadData} disabled={saving}>Refresh</button></div></div>
    {error && <div role="alert" className="admin-error">{error}</div>}
    {section === 'overview' && <><div className="admin-stat-grid">{countCards.map(([label, count]) => <article className="admin-stat-card" key={label}><span>{label}</span><strong>{count}</strong></article>)}</div><section className="admin-panel"><header className="admin-panel-heading"><h2>Recent administrator activity</h2></header>{data.audit.length ? <div className="admin-record-list">{data.audit.slice(0, 12).map((entry) => <div className="admin-record-row" key={entry.id}><strong>{entry.action}</strong><span>{entry.target_type} · {entry.target_id || '—'}</span><time>{new Date(entry.created_at).toLocaleString()}</time></div>)}</div> : <Empty>No administrative actions have been recorded yet.</Empty>}</section></>}
    {section === 'users' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Profiles and account controls</h2><span>Profile rows only; Clerk email addresses are not stored in this schema.</span></header><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Member</th><th>Joined</th><th>Posts</th><th>Projects</th><th>Status</th><th>Role / Actions</th></tr></thead><tbody>{matching(data.users, ['username', 'clerk_user_id']).map((profile) => { const status = statusById.get(profile.clerk_user_id); const postCount = data.posts.filter((post) => post.clerk_user_id === profile.clerk_user_id).length; const projectCount = data.projects.filter((project) => project.clerk_user_id === profile.clerk_user_id).length; return <tr key={profile.id}><td><strong>{profile.username || 'CodeCraft member'}</strong><small>{profile.clerk_user_id}</small></td><td>{new Date(profile.created_at).toLocaleDateString()}</td><td>{postCount}</td><td>{projectCount}</td><td><span className={`admin-status ${status?.status || 'active'}`}>{status?.status || 'active'}</span>{status?.reason && <small>{status.reason}</small>}</td><td className="admin-row-actions"><span>{roleSet.has(profile.clerk_user_id) ? 'Admin' : 'Member'}</span><button type="button" onClick={() => setRole(profile.clerk_user_id, !roleSet.has(profile.clerk_user_id))}>{roleSet.has(profile.clerk_user_id) ? 'Remove admin' : 'Assign admin'}</button><button type="button" onClick={() => setStatus(profile.clerk_user_id, status?.status === 'active' ? 'suspended' : 'active')}>{status?.status === 'active' || !status ? 'Suspend' : 'Restore'}</button><button type="button" onClick={() => setStatus(profile.clerk_user_id, status?.status === 'banned' ? 'active' : 'banned')}>{status?.status === 'banned' ? 'Unban' : 'Ban'}</button></td></tr> })}</tbody></table>{!matching(data.users, ['username', 'clerk_user_id']).length && <Empty>No matching profile records.</Empty>}</div></section>}
    {section === 'users' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Recent learning activity</h2><span>Recorded quiz attempts and challenge submissions from Supabase.</span></header>{[...data.attempts.map((entry) => ({ ...entry, activity: 'Quiz attempt', timestamp: entry.submitted_at })), ...data.submissions.map((entry) => ({ ...entry, activity: 'Challenge submission', timestamp: entry.submitted_at }))].filter((entry) => !query.trim() || entry.clerk_user_id.toLowerCase().includes(query.trim().toLowerCase())).sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp)).slice(0, 30).map((entry) => <div className="admin-record-row" key={`${entry.activity}-${entry.id}`}><div><strong>{entry.activity}</strong><span>{profileById.get(entry.clerk_user_id)?.username || entry.clerk_user_id} · {entry.activity === 'Quiz attempt' ? `${entry.score}/${entry.total_questions} correct` : 'Saved submission'}</span></div><time>{new Date(entry.timestamp).toLocaleString()}</time></div>)}{!data.attempts.length && !data.submissions.length && <Empty>No quiz or challenge activity has been recorded.</Empty>}</section>}
    {section === 'community' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Community posts</h2><span>Deleting a post leaves its linked project intact.</span></header><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Post</th><th>Author</th><th>Attachments</th><th>Created</th><th>Actions</th></tr></thead><tbody>{matching(data.posts, ['content', 'post_type', 'clerk_user_id']).map((post) => <tr key={post.id}><td>{post.content?.slice(0, 140) || 'Empty post'}<small>{post.post_type}</small></td><td>{profileById.get(post.clerk_user_id)?.username || post.clerk_user_id}</td><td>{data.attachments.filter((item) => item.post_id === post.id).length}</td><td>{new Date(post.created_at).toLocaleString()}</td><td className="admin-row-actions"><button type="button" onClick={() => setSelectedPost(post)}>Details</button><button type="button" className="danger" onClick={() => deletePost(post)}>Delete post</button></td></tr>)}</tbody></table>{!matching(data.posts, ['content', 'post_type', 'clerk_user_id']).length && <Empty>No matching posts.</Empty>}</div>{selectedPost && <div className="admin-detail"><button type="button" className="admin-close" onClick={() => setSelectedPost(null)}>Close</button><h3>Post details</h3><p>{selectedPost.content}</p><small>Author: {profileById.get(selectedPost.clerk_user_id)?.username || selectedPost.clerk_user_id} · {new Date(selectedPost.created_at).toLocaleString()}</small>{data.attachments.filter((item) => item.post_id === selectedPost.id).map((item) => <div key={item.id} className="admin-attachment">{item.kind}: <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a></div>)}</div>}</section>}
    {section === 'community' && selectedPost?.project_id && (() => { const project = data.projects.find((entry) => entry.id === selectedPost.project_id); return <section className="admin-panel"><header className="admin-panel-heading"><h2>Linked CodeCraft project</h2><span>Read-only reference; post moderation does not delete this project.</span></header>{project ? <div className="admin-project-detail"><strong>{project.title || project.name || 'Untitled project'}</strong><span>{project.language || 'Language not specified'} · Updated {new Date(project.updated_at || project.created_at).toLocaleString()}</span><p>{project.description || 'No project description.'}</p>{project.preview_image_url && <a href={project.preview_image_url} target="_blank" rel="noreferrer">Open project preview image</a>}{project.code && <details><summary>Saved project code</summary><pre>{project.code}</pre></details>}</div> : <Empty>The linked project record is unavailable.</Empty>}</section> })()}
    {section === 'reports' && <section className="admin-panel"><header className="admin-panel-heading"><h2>User-submitted reports</h2><span>Reporter and target IDs are Clerk identities.</span></header><div className="admin-record-list">{matching(data.reports, ['reason', 'details', 'target_clerk_user_id', 'reporter_clerk_user_id', 'status']).map((report) => <article className="admin-report" key={report.id}><div><strong>{report.reason}</strong><p>{report.details || 'No additional detail.'}</p><small>Reporter {report.reporter_clerk_user_id} · {report.target_type} {report.post_id || report.target_clerk_user_id} · {new Date(report.created_at).toLocaleString()}</small></div><div className="admin-row-actions"><span className={`admin-status ${report.status}`}>{report.status}</span>{report.status !== 'resolved' && <button type="button" onClick={() => updateReport(report, 'resolved')}>Resolve</button>}{report.status !== 'dismissed' && <button type="button" onClick={() => updateReport(report, 'dismissed')}>Dismiss</button>}</div></article>)}{!data.reports.length && <Empty>No reports have been submitted.</Empty>}</div></section>}
    {section === 'projects' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Saved projects</h2><span>Read-only administration view; project ownership and files are preserved.</span></header><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Project</th><th>Owner</th><th>Language</th><th>Created</th><th>Updated</th></tr></thead><tbody>{matching(data.projects, ['title', 'name', 'clerk_user_id', 'language']).map((project) => <tr key={project.id}><td><strong>{project.title || project.name || 'Untitled project'}</strong><small>{project.description}</small></td><td>{profileById.get(project.clerk_user_id)?.username || project.clerk_user_id}</td><td>{project.language || '—'}</td><td>{new Date(project.created_at).toLocaleDateString()}</td><td>{new Date(project.updated_at || project.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!data.projects.length && <Empty>No saved projects.</Empty>}</div></section>}
    {section === 'learn' && <><section className="admin-panel"><header className="admin-panel-heading"><h2>Courses</h2><button type="button" onClick={() => beginCreate({ title: '', description: '', category: 'General', difficulty: 'Beginner', icon: 'CC', position: 0 })}>New course</button></header>{form && !form.course_id && section === 'learn' && <div className="admin-editor"><div className="admin-editor-grid">{editInput('title', 'Title')}{editInput('category', 'Category')}{editInput('difficulty', 'Difficulty', { type: 'select', choices: ['Beginner', 'Intermediate', 'Advanced'] })}{editInput('icon', 'Icon label')}{editInput('position', 'Order', { type: 'number' })}{editInput('published', 'Published', { type: 'checkbox' })}{editInput('description', 'Description', { type: 'textarea', rows: 3 })}</div><div className="admin-row-actions"><button type="button" onClick={saveCourse} disabled={saving}>Save course</button><button type="button" onClick={resetForm}>Cancel</button></div></div>}<div className="admin-record-list">{data.courses.map((course) => <div className="admin-record-row" key={course.id}><div><strong>{course.title}</strong><span>{course.category} · {course.difficulty} · {course.published ? 'Published' : 'Draft'}</span></div><div className="admin-row-actions"><button type="button" onClick={() => beginEdit(course)}>Edit</button><button type="button" onClick={() => togglePublished('courses', course, 'course_publish_changed')}>{course.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteRecord('courses', course, 'course_deleted')}>Delete</button></div></div>)}{!data.courses.length && <Empty>No admin-managed courses yet.</Empty>}</div></section><section className="admin-panel"><header className="admin-panel-heading"><h2>Lessons</h2><Field label="Course"><select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}><option value="">Select course</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field><button type="button" disabled={!selectedCourse} onClick={() => beginCreate({ course_id: selectedCourse, title: '', content: '', position: 0 })}>New lesson</button></header>{form?.course_id === selectedCourse && selectedCourse && <div className="admin-editor"><div className="admin-editor-grid">{editInput('title', 'Lesson title')}{editInput('position', 'Order', { type: 'number' })}{editInput('published', 'Published', { type: 'checkbox' })}{editInput('content', 'Lesson content', { type: 'textarea', rows: 6 })}</div><div className="admin-row-actions"><button type="button" onClick={saveLesson} disabled={saving}>Save lesson</button><button type="button" onClick={resetForm}>Cancel</button></div></div>}{data.lessons.filter((lesson) => lesson.course_id === selectedCourse).map((lesson) => <div className="admin-record-row" key={lesson.id}><div><strong>{lesson.position + 1}. {lesson.title}</strong><span>{lesson.published ? 'Published' : 'Draft'}</span></div><div className="admin-row-actions"><button type="button" onClick={() => beginEdit(lesson)}>Edit</button><button type="button" onClick={() => togglePublished('lessons', lesson, 'lesson_publish_changed')}>{lesson.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteRecord('lessons', lesson, 'lesson_deleted')}>Delete</button></div></div>)}</section></>}
    {section === 'challenges' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Challenges</h2><button type="button" onClick={() => beginCreate({ title: '', description: '', difficulty: 'Beginner', instructions: '', starter_code: '', expected_solution: '', validation_data: '{}', position: 0 })}>New challenge</button></header>{Object.keys(form).length > 0 && <div className="admin-editor"><div className="admin-editor-grid">{editInput('title', 'Title')}{editInput('difficulty', 'Difficulty', { type: 'select', choices: ['Beginner', 'Intermediate', 'Advanced'] })}{editInput('position', 'Order', { type: 'number' })}{editInput('published', 'Published', { type: 'checkbox' })}{editInput('description', 'Description', { type: 'textarea' })}{editInput('instructions', 'Instructions', { type: 'textarea' })}{editInput('starter_code', 'Starter code', { type: 'textarea' })}{editInput('expected_solution', 'Expected solution (private)', { type: 'textarea' })}{editInput('validation_data', 'Validation JSON (private)', { type: 'textarea' })}</div><div className="admin-row-actions"><button type="button" onClick={saveChallenge} disabled={saving}>Save challenge</button><button type="button" onClick={resetForm}>Cancel</button></div></div>}{data.challenges.map((challenge) => <div className="admin-record-row" key={challenge.id}><div><strong>{challenge.title}</strong><span>{challenge.difficulty} · {challenge.published ? 'Published' : 'Draft'}</span></div><div className="admin-row-actions"><button type="button" onClick={async () => { beginEdit(challenge); const result = await supabase.from('challenge_private_data').select('*').eq('challenge_id', challenge.id).maybeSingle(); setForm((old) => ({ ...old, ...result.data, validation_data: JSON.stringify(result.data?.validation_data || {}) })) }}>Edit</button><button type="button" onClick={() => togglePublished('challenges', challenge, 'challenge_publish_changed')}>{challenge.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteRecord('challenges', challenge, 'challenge_deleted')}>Delete</button></div></div>)}</section>}
    {section === 'quizzes' && builderQuiz !== null && <div className="admin-builder-host"><QuizBuilder quiz={builderQuiz || null} onClose={() => setBuilderQuiz(null)} onSaved={() => { void loadData() }} /></div>}
    {section === 'quizzes' && builderQuiz === null && <section className="admin-panel"><header className="admin-panel-heading"><h2>Quizzes and questions</h2><div className="admin-row-actions"><button type="button" onClick={() => beginCreate({ title: '', description: '', position: 0 })}>Legacy form</button><button type="button" className="button button-small" onClick={() => setBuilderQuiz(false)}>+ Add Quiz (Builder)</button></div></header>{Object.keys(form).length > 0 && <div className="admin-editor"><div className="admin-editor-grid">{editInput('title', 'Title')}{editInput('position', 'Order', { type: 'number' })}{editInput('description', 'Description', { type: 'textarea' })}{editInput('published', 'Published', { type: 'checkbox' })}</div><div className="admin-row-actions"><button type="button" onClick={saveQuiz} disabled={saving}>Save quiz</button><button type="button" onClick={resetForm}>Cancel</button></div></div>}{data.quizzes.map((quiz) => <article className="admin-nested-record" key={quiz.id}><header className="admin-record-row"><div><strong>{quiz.title}</strong><span>{quiz.published ? 'Published' : 'Draft'} · {data.questions.filter((question) => question.quiz_id === quiz.id).length} questions</span></div>                <div className="admin-row-actions"><button type="button" onClick={() => setBuilderQuiz({ id: quiz.id })}>Edit in Builder</button><button type="button" onClick={() => { beginEdit(quiz); setSelectedQuiz(quiz.id) }}>Legacy edit</button><button type="button" onClick={() => setSelectedQuiz(selectedQuiz === quiz.id ? '' : quiz.id)}>Questions</button><button type="button" onClick={() => togglePublished('quizzes', quiz, 'quiz_publish_changed')}>{quiz.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteRecord('quizzes', quiz, 'quiz_deleted')}>Delete</button></div></header>{selectedQuiz === quiz.id && <div className="admin-editor"><div className="admin-editor-grid"><Field label="Question"><textarea value={questionForm.question} onChange={(event) => setQuestionForm((old) => ({ ...old, question: event.target.value }))} /></Field><Field label="Options (one per line)"><textarea value={questionForm.options} onChange={(event) => setQuestionForm((old) => ({ ...old, options: event.target.value }))} /></Field><Field label="Correct option number"><input type="number" min="0" value={questionForm.correct} onChange={(event) => setQuestionForm((old) => ({ ...old, correct: event.target.value }))} /></Field><Field label="Explanation"><textarea value={questionForm.explanation} onChange={(event) => setQuestionForm((old) => ({ ...old, explanation: event.target.value }))} /></Field></div><button type="button" onClick={saveQuestion} disabled={saving}>{questionForm.id ? 'Save question' : 'Add question'}</button>{data.questions.filter((question) => question.quiz_id === quiz.id).map((question, index) => <div className="admin-record-row" key={question.id}><span>{index + 1}. {question.question}</span><div className="admin-row-actions"><button type="button" onClick={async () => { const keyResult = await supabase.from('quiz_answer_keys').select('*').eq('question_id', question.id).maybeSingle(); const options = Array.isArray(question.options) ? question.options : []; setQuestionForm({ id: question.id, position: question.position, question: question.question, options: options.join('\n'), correct: String(Math.max(0, options.indexOf(keyResult.data?.correct_answer))), explanation: keyResult.data?.explanation || '' }) }}>Edit</button><button type="button" className="danger" onClick={() => saveQuizQuestion(question)}>Delete question</button></div></div>)}</div>}</article>)}</section>}
    {section === 'certificates' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Issued certificates</h2><span>Only records actually issued into the certificates table are shown.</span></header><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Certificate</th><th>Recipient</th><th>Code</th><th>Issued</th><th>Action</th></tr></thead><tbody>{matching(data.certificates, ['title', 'clerk_user_id', 'certificate_code']).map((certificate) => <tr key={certificate.id}><td>{certificate.title}</td><td>{profileById.get(certificate.clerk_user_id)?.username || certificate.clerk_user_id}</td><td>{certificate.certificate_code}</td><td>{new Date(certificate.issued_at).toLocaleDateString()}</td><td><button type="button" className="danger" onClick={() => deleteRecord('certificates', certificate, 'certificate_revoked')}>Revoke</button></td></tr>)}</tbody></table>{!data.certificates.length && <Empty>No certificates have been issued.</Empty>}</div></section>}
    {section === 'announcements' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Announcements</h2><button type="button" onClick={() => beginCreate({ title: '', body: '', is_published: false, publish_at: today(), audience: 'all' })}>New announcement</button></header>{Object.keys(form).length > 0 && <div className="admin-editor"><div className="admin-editor-grid">{editInput('title', 'Title')}{editInput('audience', 'Audience', { type: 'select', choices: ['all'] })}{editInput('publish_at', 'Publish date', { type: 'datetime-local' })}{editInput('is_published', 'Published', { type: 'checkbox' })}{editInput('body', 'Message', { type: 'textarea', rows: 5 })}</div><div className="admin-row-actions"><button type="button" onClick={createAnnouncement} disabled={saving}>Save announcement</button><button type="button" onClick={resetForm}>Cancel</button></div></div>}{data.announcements.map((announcement) => <div className="admin-record-row" key={announcement.id}><div><strong>{announcement.title}</strong><span>{announcement.is_published ? 'Published' : 'Draft'} · {announcement.publish_at ? new Date(announcement.publish_at).toLocaleString() : 'Publish immediately'}</span><p>{announcement.body}</p></div><div className="admin-row-actions"><button type="button" onClick={() => beginEdit({ ...announcement, publish_at: announcement.publish_at ? new Date(announcement.publish_at).toISOString().slice(0, 16) : '' })}>Edit</button><button type="button" onClick={() => runAction(async () => { const result = await supabase.from('announcements').update({ is_published: !announcement.is_published }).eq('id', announcement.id); if (result.error) throw result.error; await writeAudit('announcement_publish_changed', 'announcement', announcement.id) })}>{announcement.is_published ? 'Unpublish' : 'Publish'}</button><button type="button" className="danger" onClick={() => deleteRecord('announcements', announcement, 'announcement_deleted')}>Delete</button></div></div>)}</section>}
    {section === 'analytics' && <><div className="admin-stat-grid">{countCards.map(([label, count]) => <article className="admin-stat-card" key={label}><span>{label}</span><strong>{count}</strong></article>)}</div><section className="admin-panel"><header className="admin-panel-heading"><h2>Recent activity</h2><span>Counts are queried from Supabase; no synthetic activity is included.</span></header>{data.audit.slice(0, 30).map((entry) => <div className="admin-record-row" key={entry.id}><strong>{entry.action}</strong><span>{entry.target_type} · {entry.target_id}</span><time>{new Date(entry.created_at).toLocaleString()}</time></div>)}</section></>}
    {section === 'activity' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Administrator audit log</h2></header>{data.audit.length ? data.audit.map((entry) => <div className="admin-record-row" key={entry.id}><div><strong>{entry.action}</strong><span>Actor {entry.actor_clerk_user_id} · {entry.target_type} {entry.target_id}</span></div><time>{new Date(entry.created_at).toLocaleString()}</time></div>) : <Empty>No admin actions have been recorded.</Empty>}</section>}
    {section === 'settings' && <section className="admin-panel"><header className="admin-panel-heading"><h2>Platform settings</h2></header>{[['maintenance_mode', 'Maintenance mode'], ['community_enabled', 'Community enabled']].map(([key, label]) => <label className="admin-setting-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(settingValue(key))} onChange={(event) => saveSetting(key, event.target.checked)} /></label>)}<p className="admin-note">These settings are stored persistently. Maintenance enforcement is not applied to user routes.</p></section>}
  </div></div></main>
}

function safeJson(value) {
  try { return JSON.parse(value || '') } catch { throw new Error('Validation data must be valid JSON.') }
}

function storagePathFromUrl(url, bucket) {
  if (!url || !bucket) return null
  try {
    const pathname = decodeURIComponent(new URL(url).pathname)
    const marker = `/storage/v1/object/public/${bucket}/`
    const index = pathname.indexOf(marker)
    return index < 0 ? null : pathname.slice(index + marker.length)
  } catch { return null }
}

export default AdminControlCenter
