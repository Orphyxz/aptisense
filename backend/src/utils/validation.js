function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isEmail(value) {
  return isNonEmptyString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function validateAuthPayload(payload, mode) {
  const errors = []

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Request body must be a JSON object']
  }

  if (mode === 'register') {
    if (!isNonEmptyString(payload.name)) {
      errors.push('Name is required')
    } else if (payload.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long')
    }
  }

  if (!isEmail(payload.email)) {
    errors.push('A valid email is required')
  }

  if (!isNonEmptyString(payload.password)) {
    errors.push('Password is required')
  } else if (payload.password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }

  if (mode === 'register' && payload.role !== undefined && !['student', 'admin'].includes(payload.role)) {
    errors.push('Role must be either student or admin')
  }

  return errors
}

function validateAnswerSubmission(payload) {
  const errors = []

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Request body must be a JSON object']
  }

  if (payload.answers !== undefined && !Array.isArray(payload.answers)) {
    errors.push('Answers must be an array')
  }

  if (Array.isArray(payload.answers)) {
    payload.answers.forEach((answer, index) => {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
        errors.push(`Answer ${index + 1} must be an object`)
        return
      }

      if (!isNonEmptyString(answer.sectionName)) {
        errors.push(`Answer ${index + 1} is missing a valid sectionName`)
      }

      if (!Number.isInteger(answer.questionIndex) || answer.questionIndex < 0) {
        errors.push(`Answer ${index + 1} has an invalid questionIndex`)
      }

      if (!Number.isInteger(answer.selectedOption) || answer.selectedOption < 0) {
        errors.push(`Answer ${index + 1} has an invalid selectedOption`)
      }
    })
  }

  if (payload.timeTaken !== undefined) {
    if (!Number.isFinite(payload.timeTaken) || payload.timeTaken < 0) {
      errors.push('timeTaken must be a non-negative number')
    }
  }

  return errors
}

function validateTestPayload(payload) {
  const errors = []

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Request body must be a JSON object']
  }

  if (!isNonEmptyString(payload.title)) errors.push('Title is required')
  if (!isNonEmptyString(payload.company)) errors.push('Company is required')
  if (!isNonEmptyString(payload.pattern)) errors.push('Pattern is required')

  if (!['Easy', 'Medium', 'Hard'].includes(payload.level)) {
    errors.push('Level must be Easy, Medium, or Hard')
  }

  if (!Number.isInteger(payload.timeLimit) || payload.timeLimit <= 0) {
    errors.push('timeLimit must be a positive integer')
  }

  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    errors.push('At least one section is required')
    return errors
  }

  payload.sections.forEach((section, sectionIndex) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      errors.push(`Section ${sectionIndex + 1} must be an object`)
      return
    }

    if (!isNonEmptyString(section.name)) {
      errors.push(`Section ${sectionIndex + 1} must have a name`)
    }

    if (!Array.isArray(section.questions) || section.questions.length === 0) {
      errors.push(`Section ${sectionIndex + 1} must contain at least one question`)
      return
    }

    section.questions.forEach((question, questionIndex) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) {
        errors.push(`Question ${questionIndex + 1} in section ${sectionIndex + 1} must be an object`)
        return
      }

      if (!isNonEmptyString(question.question)) {
        errors.push(`Question ${questionIndex + 1} in section ${sectionIndex + 1} must have text`)
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${questionIndex + 1} in section ${sectionIndex + 1} must have at least 2 options`)
      } else if (question.options.some((option) => !isNonEmptyString(option))) {
        errors.push(`Question ${questionIndex + 1} in section ${sectionIndex + 1} has an invalid option`)
      }

      if (
        !Number.isInteger(question.correctAnswer) ||
        question.correctAnswer < 0 ||
        !Array.isArray(question.options) ||
        question.correctAnswer >= question.options.length
      ) {
        errors.push(`Question ${questionIndex + 1} in section ${sectionIndex + 1} has an invalid correctAnswer index`)
      }
    })
  })

  return errors
}

module.exports = {
  validateAuthPayload,
  validateAnswerSubmission,
  validateTestPayload
}
