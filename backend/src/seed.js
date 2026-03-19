require('dotenv').config()
const bcrypt = require('bcryptjs')
const connectDB = require('./config/db')
const User = require('./models/User')
const Test = require('./models/Test')
const { companyQuestionBank } = require('./data/questionBank')

const companyCatalog = [
  {
    company: 'General',
    pattern: {
      Easy: 'General placement foundation round with beginner-friendly aptitude coverage',
      Medium: 'General placement round with balanced aptitude and reasoning pressure',
      Hard: 'General placement challenge with tougher timing and higher reasoning demand',
    },
  },
  {
    company: 'TCS',
    pattern: {
      Easy: 'TCS-style starter round focused on accuracy, arithmetic basics, and gentle reasoning',
      Medium: 'TCS-style practice with balanced quant, logical, and verbal sections',
      Hard: 'TCS-style advanced mock with tighter decision-making and sustained accuracy',
    },
  },
  {
    company: 'Infosys',
    pattern: {
      Easy: 'Infosys-style warm-up emphasizing clarity, grammar, and foundational aptitude',
      Medium: 'Infosys-style mock with steady pace across quant, logic, and verbal',
      Hard: 'Infosys-style challenge with sharper logic and stronger verbal precision',
    },
  },
  {
    company: 'Wipro',
    pattern: {
      Easy: 'Wipro-style beginner round centered on fundamentals and quick wins',
      Medium: 'Wipro-style balanced mock that rewards consistency and time control',
      Hard: 'Wipro-style demanding mock with stronger section-to-section pressure',
    },
  },
]

function createSections(company, level) {
  const levelBank = companyQuestionBank[company]?.[level]

  if (!levelBank) {
    throw new Error(`Missing question bank for ${company} - ${level}`)
  }

  const sections = [
    { name: 'Quantitative Ability', questions: levelBank.quant },
    { name: 'Logical Reasoning', questions: levelBank.logical },
    { name: 'Verbal Ability', questions: levelBank.verbal },
  ]

  for (const section of sections) {
    if (section.questions.length !== 10) {
      throw new Error(`${company} - ${level} - ${section.name} must contain exactly 10 questions`)
    }
  }

  return sections
}

function buildSeedTests() {
  return companyCatalog.flatMap(({ company, pattern }) =>
    ['Easy', 'Medium', 'Hard'].map((level) => ({
      title: `${company} Mock Test - ${level}`,
      company,
      level,
      pattern: pattern[level],
      timeLimit: 60,
      sections: createSections(company, level),
    })),
  )
}

async function seed() {
  await connectDB()

  const adminEmail = 'admin@apsit.edu.in'
  const studentEmail = 'student@apsit.edu.in'

  const adminExists = await User.findOne({ email: adminEmail })
  const studentExists = await User.findOne({ email: studentEmail })

  if (!adminExists) {
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: await bcrypt.hash('admin1234', 12),
      role: 'admin',
    })
  }

  if (!studentExists) {
    await User.create({
      name: 'Student User',
      email: studentEmail,
      password: await bcrypt.hash('student1234', 12),
      role: 'student',
    })
  }

  const seedTests = buildSeedTests()

  for (const test of seedTests) {
    await Test.findOneAndUpdate(
      { title: test.title },
      test,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  await Test.deleteMany({
    title: {
      $in: ['AptiSense Mock Test - Easy', 'AptiSense Mock Test - Medium', 'AptiSense Mock Test - Hard'],
    },
  })

  console.log('Seed complete')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
