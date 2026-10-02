// Pure quiz-result calculation shared by the student quiz flow and its tests.
// Answers are stored by question.id and hold the option TEXT (stable identity,
// randomization-safe). Score is always correctAnswers / totalQuestions — never
// correct / attempted.

export function normalizeQuizOptions(rawOptions) {
  if (rawOptions === null || rawOptions === undefined) return []
  // Legacy rows may store options as a JSON string or newline/pipe-separated text.
  if (typeof rawOptions === 'string') {
    try {
      const parsed = JSON.parse(rawOptions)
      if (Array.isArray(parsed)) rawOptions = parsed
      else rawOptions = [rawOptions]
    } catch {
      rawOptions = rawOptions.split(/\n|\|/).map((entry) => entry.trim())
    }
  }
  if (!Array.isArray(rawOptions)) return []
  return rawOptions
    .map((option) => (option === null || option === undefined ? '' : typeof option === 'string' ? option : String(option?.text ?? option?.value ?? option?.label ?? option)))
    .filter((option) => String(option).length > 0)
}

export function resolveQuizCorrectAnswer(question) {
  const correct = question?.correct_answer ?? question?.answer ?? question?.expected_answer ?? null
  return correct === undefined ? null : correct
}

// Progress snapshot taken the instant submission begins, so a state race or a
// mid-submission error can never lose the student's answers.
export function makeProgressSnapshot(answers, timeLeft) {
  const snapshotAnswers = {}
  if (answers && typeof answers === 'object') {
    Object.keys(answers).forEach((key) => {
      snapshotAnswers[key] = answers[key]
    })
  }
  return { answers: snapshotAnswers, timeLeft: Number(timeLeft || 0) }
}

/**
 * @param {Array} questions quiz questions in display order
 * @param {Object} answers map of question.id -> selected option text
 * @param {Object} meta { xpReward, timeLimitSeconds, timeLeft }
 */
export function calculateQuizResult(questions, answers, meta = {}) {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {}
  let correctAnswers = 0
  let wrongAnswers = 0
  let unansweredQuestions = 0

  const answerReview = questions.map((question) => {
    const options = normalizeQuizOptions(question.options || question.answer_options || question.choices || [])
    const correctAnswer = resolveQuizCorrectAnswer(question)
    const selectedAnswer = safeAnswers[question.id]

    if (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') {
      unansweredQuestions += 1
      return {
        questionId: question.id,
        question: question.question,
        options,
        selectedAnswer: null,
        correctAnswer,
        isCorrect: false,
        unanswered: true,
        explanation: question.explanation || '',
      }
    }

    const isCorrect = String(selectedAnswer) === String(correctAnswer)
    if (isCorrect) correctAnswers += 1
    else wrongAnswers += 1
    return {
      questionId: question.id,
      question: question.question,
      options,
      selectedAnswer,
      correctAnswer,
      isCorrect,
      unanswered: false,
      explanation: question.explanation || '',
    }
  })

  const totalQuestions = questions.length
  const questionsAttempted = totalQuestions - unansweredQuestions
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const xpReward = Number(meta.xpReward || 0)
  const timeLeft = Number(meta.timeLeft || 0)
  const timeLimitSeconds = Number(meta.timeLimitSeconds || 0)

  return {
    totalQuestions,
    questionsAttempted,
    correctAnswers,
    wrongAnswers,
    unansweredQuestions,
    score: correctAnswers,
    percentage,
    xpEarned: Math.round((percentage / 100) * xpReward),
    timeUsed: timeLimitSeconds > 0 ? Math.max(0, timeLimitSeconds - timeLeft) : null,
    answerReview,
  }
}
