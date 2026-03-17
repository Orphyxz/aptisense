require('dotenv').config()
const bcrypt = require('bcryptjs')
const connectDB = require('./config/db')
const User = require('./models/User')
const Test = require('./models/Test')

function q(question, options, correctAnswer) {
  return { question, options, correctAnswer }
}

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

const questionBank = {
  Easy: {
    quant: [
      q('What is 10% of 150?', ['10', '15', '20', '25'], 1),
      q('If 8 + x = 14, what is x?', ['4', '5', '6', '7'], 2),
      q('What is the average of 4, 6, and 8?', ['5', '6', '7', '8'], 1),
      q('A car covers 40 km in 1 hour. What is its speed?', ['30 km/h', '35 km/h', '40 km/h', '45 km/h'], 2),
      q('What is 9 x 7?', ['56', '63', '72', '81'], 1),
      q('What is half of 96?', ['46', '48', '52', '54'], 1),
      q('Which number is a multiple of 6?', ['32', '36', '38', '40'], 1),
      q('What is 81 divided by 9?', ['7', '8', '9', '10'], 2),
      q('If a pen costs 12 rupees, what do 3 pens cost?', ['24', '30', '36', '42'], 2),
      q('What is the next number: 5, 10, 15, 20, ?', ['22', '23', '24', '25'], 3),
    ],
    logical: [
      q('Find the odd one out: Rose, Lotus, Lily, Chair', ['Rose', 'Lotus', 'Lily', 'Chair'], 3),
      q('If all dogs are animals and all animals need food, dogs need?', ['Water only', 'Food', 'Shoes', 'Cars'], 1),
      q('Series: 3, 6, 9, 12, ?', ['14', '15', '16', '18'], 1),
      q('Which comes next: B, D, F, H, ?', ['I', 'J', 'K', 'L'], 1),
      q('Book is to Read as Pen is to?', ['Write', 'Draw', 'Erase', 'Measure'], 0),
      q('If CAT is coded as 3120, what is the code for DOG?', ['4157', '4715', '4156', '4716'], 3),
      q('Morning is to Breakfast as Night is to?', ['Lunch', 'Dinner', 'Snack', 'Tea'], 1),
      q('Which shape has three sides?', ['Square', 'Triangle', 'Circle', 'Rectangle'], 1),
      q('If today is Monday, what day comes after two days?', ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], 1),
      q('Find the missing number: 2, 4, 6, 8, ?', ['9', '10', '11', '12'], 1),
    ],
    verbal: [
      q('Choose the synonym of "Happy".', ['Sad', 'Glad', 'Angry', 'Weak'], 1),
      q('Fill in the blank: They ____ playing outside.', ['is', 'are', 'was', 'be'], 1),
      q('Choose the correctly spelled word.', ['Enviroment', 'Environment', 'Envirenment', 'Enviornment'], 1),
      q('Antonym of "Fast" is?', ['Quick', 'Slow', 'Sharp', 'Smart'], 1),
      q('Choose the correct sentence.', ['She go to school.', 'She goes to school.', 'She going to school.', 'She gone to school.'], 1),
      q('What is the plural of "Child"?', ['Childs', 'Children', 'Childes', 'Childer'], 1),
      q('Choose the synonym of "Begin".', ['End', 'Start', 'Stop', 'Close'], 1),
      q('Fill in the blank: I have ____ apple.', ['a', 'an', 'the', 'no article'], 1),
      q('Antonym of "Strong" is?', ['Bold', 'Weak', 'Firm', 'Hard'], 1),
      q('Choose the correct word: The sun ____ in the east.', ['rise', 'rises', 'rising', 'rose'], 1),
    ],
  },
  Medium: {
    quant: [
      q('What is 18% of 250?', ['35', '40', '45', '50'], 2),
      q('If 3x - 5 = 16, what is x?', ['5', '6', '7', '8'], 2),
      q('The average of 12, 18, 24, 30 is?', ['19', '20', '21', '22'], 2),
      q('A train covers 180 km in 3 hours. Speed?', ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], 2),
      q('What is 14 x 9?', ['116', '124', '126', '128'], 2),
      q('A number increased by 15 becomes 42. The number is?', ['25', '26', '27', '28'], 2),
      q('What is 20% of 90?', ['16', '18', '20', '22'], 1),
      q('If 5 notebooks cost 125 rupees, one notebook costs?', ['20', '22', '25', '30'], 2),
      q('Simplify: 72 / 8 + 6', ['12', '14', '15', '16'], 2),
      q('Find the next number: 2, 6, 12, 20, ?', ['28', '30', '32', '36'], 1),
    ],
    logical: [
      q('Find the odd one out: Copper, Iron, Silver, Plastic', ['Copper', 'Iron', 'Silver', 'Plastic'], 3),
      q('If some pens are books and all books are bags, some pens are definitely?', ['Bags', 'Not bags', 'Pencils', 'Boxes'], 0),
      q('Series: 5, 10, 20, 40, ?', ['60', '70', '80', '90'], 2),
      q('Which comes next: Z, X, V, T, ?', ['R', 'S', 'Q', 'P'], 0),
      q('Clock is to Time as Thermometer is to?', ['Heat', 'Temperature', 'Water', 'Speed'], 1),
      q('If EAST is coded as 5134, what is the code for SEAT?', ['3514', '3154', '3514', '3145'], 0),
      q('Statement: All fruits are foods. Apple is a fruit. Conclusion?', ['Apple is food', 'Food is apple', 'Apple is vegetable', 'None'], 0),
      q('Find the missing number: 11, 13, 17, 19, ?', ['21', '22', '23', '25'], 2),
      q('If today is Thursday, what day will it be after 10 days?', ['Saturday', 'Sunday', 'Monday', 'Tuesday'], 1),
      q('Choose the pair with the same relation: Teacher : School', ['Doctor : Hospital', 'Pilot : River', 'Chef : Garden', 'Driver : Ocean'], 0),
    ],
    verbal: [
      q('Choose the synonym of "Accurate".', ['Exact', 'Late', 'Weak', 'Funny'], 0),
      q('Fill in the blank: Neither the teacher nor the students ____ late.', ['was', 'were', 'is', 'be'], 1),
      q('Choose the correctly spelled word.', ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'], 2),
      q('Antonym of "Expand" is?', ['Increase', 'Stretch', 'Contract', 'Widen'], 2),
      q('Choose the correct sentence.', ['Each of the boys have a book.', 'Each of the boys has a book.', 'Each of the boys having a book.', 'Each of the boys have books.'], 1),
      q('Choose the synonym of "Brief".', ['Short', 'Long', 'Clear', 'Quiet'], 0),
      q('Fill in the blank: She has been working here ____ 2021.', ['for', 'since', 'from', 'by'], 1),
      q('Choose the correctly punctuated sentence.', ['Lets eat, grandma.', 'Let\'s eat, grandma.', 'Lets eat grandma.', 'Let\'s eat grandma'], 1),
      q('Antonym of "Scarce" is?', ['Rare', 'Plenty', 'Tiny', 'Sharp'], 1),
      q('Choose the word closest in meaning to "Observe".', ['Ignore', 'Notice', 'Forget', 'Hide'], 1),
    ],
  },
  Hard: {
    quant: [
      q('A shop offers 20% discount on an item priced at 1500 rupees. What is the selling price?', ['1100', '1150', '1200', '1250'], 2),
      q('If 4x + 7 = 31, what is x?', ['5', '6', '7', '8'], 1),
      q('The average of 14, 19, 23, 27, and 32 is?', ['22', '23', '24', '25'], 1),
      q('A car travels 240 km at 60 km/h and returns at 40 km/h. Total time taken is?', ['8 hr', '9 hr', '10 hr', '11 hr'], 2),
      q('What is the simple interest on 5000 rupees at 8% per annum for 2 years?', ['700', '750', '800', '850'], 2),
      q('If the ratio of boys to girls is 5:4 and there are 180 students, how many girls are there?', ['70', '75', '80', '85'], 2),
      q('Simplify: (18 x 12) / 9 + 7', ['29', '30', '31', '32'], 2),
      q('A sum doubles in 5 years at simple interest. In how many years will it become triple?', ['8', '9', '10', '11'], 2),
      q('Find the next number: 1, 4, 9, 16, 25, ?', ['30', '32', '36', '49'], 2),
      q('If a pipe fills a tank in 12 hours, what fraction of the tank does it fill in 3 hours?', ['1/2', '1/3', '1/4', '1/5'], 2),
    ],
    logical: [
      q('Statement: All coders are problem solvers. Some problem solvers are gamers. Conclusion?', ['Some coders are definitely gamers', 'No coder is a gamer', 'Some gamers may be coders', 'All gamers are coders'], 2),
      q('Series: 2, 6, 12, 20, 30, ?', ['40', '42', '44', '46'], 1),
      q('If MONK is coded as 5768 and TAPE as 3142, what is the code for NOTE?', ['6732', '6734', '6832', '6834'], 1),
      q('Choose the odd one out: Inch, Meter, Liter, Kilometer', ['Inch', 'Meter', 'Liter', 'Kilometer'], 2),
      q('Which comes next in the pattern: AZ, BY, CX, ?', ['DW', 'DV', 'EW', 'EV'], 0),
      q('Cup is to Coffee as Bowl is to?', ['Water', 'Soup', 'Rice', 'Plate'], 1),
      q('If yesterday was Wednesday, what day will it be 100 days from today?', ['Friday', 'Saturday', 'Sunday', 'Monday'], 1),
      q('Find the missing number: 7, 14, 28, 56, ?', ['84', '96', '102', '112'], 3),
      q('A is taller than B, B is taller than C, and C is taller than D. Who is shortest?', ['A', 'B', 'C', 'D'], 3),
      q('If all red objects are heavy and some heavy objects are boxes, which statement is valid?', ['All boxes are red', 'Some boxes may be red', 'No box is heavy', 'All heavy objects are red'], 1),
    ],
    verbal: [
      q('Choose the synonym of "Meticulous".', ['Careless', 'Detailed', 'Lazy', 'Fragile'], 1),
      q('Fill in the blank: Hardly had the train left the station ____ it began to rain.', ['than', 'then', 'when', 'while'], 2),
      q('Choose the correctly spelled word.', ['Conscientious', 'Consciencious', 'Conscientous', 'Conscentious'], 0),
      q('Antonym of "Obsolete" is?', ['Ancient', 'Modern', 'Worn', 'Broken'], 1),
      q('Choose the correct sentence.', ['No sooner did he arrive when the meeting started.', 'No sooner had he arrived than the meeting started.', 'No sooner he arrived than the meeting started.', 'No sooner had he arrived when the meeting started.'], 1),
      q('Choose the word nearest in meaning to "Prudent".', ['Wise', 'Harsh', 'Rapid', 'Noisy'], 0),
      q('Fill in the blank: The report must be submitted ____ Friday evening.', ['at', 'by', 'until', 'from'], 1),
      q('Choose the correctly punctuated sentence.', ['However she decided to continue.', 'However, she decided to continue.', 'However she, decided to continue.', 'However, she decided, to continue.'], 1),
      q('Antonym of "Reluctant" is?', ['Willing', 'Silent', 'Rigid', 'Unsure'], 0),
      q('Choose the sentence with correct subject-verb agreement.', ['The list of items are on the desk.', 'The list of items is on the desk.', 'The list of items were on the desk.', 'The list of items have been on the desk.'], 1),
    ],
  },
}

function createSections(level) {
  const bank = questionBank[level]

  return [
    {
      name: 'Quantitative Ability',
      questions: bank.quant,
    },
    {
      name: 'Logical Reasoning',
      questions: bank.logical,
    },
    {
      name: 'Verbal Ability',
      questions: bank.verbal,
    },
  ]
}

function buildSeedTests() {
  return companyCatalog.flatMap(({ company, pattern }) => (
    ['Easy', 'Medium', 'Hard'].map((level) => ({
      title: `${company} Mock Test - ${level}`,
      company,
      level,
      pattern: pattern[level],
      timeLimit: 60,
      sections: createSections(level),
    }))
  ))
}

async function seed() {
  await connectDB()

  const adminEmail = 'admin@aptisense.com'
  const studentEmail = 'student@aptisense.com'

  const adminExists = await User.findOne({ email: adminEmail })
  const studentExists = await User.findOne({ email: studentEmail })

  if (!adminExists) {
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: await bcrypt.hash('admin1234', 12),
      role: 'admin'
    })
  }

  if (!studentExists) {
    await User.create({
      name: 'Student User',
      email: studentEmail,
      password: await bcrypt.hash('student1234', 12),
      role: 'student'
    })
  }

  const seedTests = buildSeedTests()

  for (const test of seedTests) {
    await Test.findOneAndUpdate(
      { title: test.title },
      test,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  await Test.deleteMany({ title: { $in: ['AptiSense Mock Test - Easy', 'AptiSense Mock Test - Medium', 'AptiSense Mock Test - Hard'] } })

  console.log('Seed complete')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
