import { GradeLevel, LessonPlan, SubjectType } from '../types';

export const BISE_BOARDS = [
  'BISE Lahore',
  'BISE Rawalpindi',
  'BISE Gujranwala',
  'BISE Faisalabad',
  'BISE Multan',
  'BISE Bahawalpur',
  'BISE Sargodha',
  'BISE Sahiwal',
  'BISE D.G. Khan',
  'Punjab All Boards Common Pattern',
];

export interface GradeConfig {
  grade: GradeLevel;
  tier: 'early' | 'primary' | 'middle' | 'matric';
  defaultDuration: string;
  timeBreakdown: { intro: number; dev: number; conc: number };
  pedagogyGuidance: string;
  subjects: SubjectType[];
}

export const GRADE_CONFIGS: Record<GradeLevel, GradeConfig> = {
  'Prep / Nursery': {
    grade: 'Prep / Nursery',
    tier: 'early',
    defaultDuration: '30 mins (5 + 20 + 5)',
    timeBreakdown: { intro: 5, dev: 20, conc: 5 },
    pedagogyGuidance: 'Very simple language, play-based & activity-based learning, songs/rhymes, flashcards, objects, drawing, oral work. Short 5-10m mini-activities. Minimal writing.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Art & Drawing', 'Physical Education'],
  },
  'Class 1': {
    grade: 'Class 1',
    tier: 'early',
    defaultDuration: '30 mins (5 + 20 + 5)',
    timeBreakdown: { intro: 5, dev: 20, conc: 5 },
    pedagogyGuidance: 'Phonics, basic vocabulary, tracing, drawing, physical counting counters, short activities, songs and high visual engagement.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Islamiyat / Tarjuma-tul-Quran', 'Art & Drawing', 'Physical Education'],
  },
  'Class 2': {
    grade: 'Class 2',
    tier: 'early',
    defaultDuration: '30 mins (5 + 20 + 5)',
    timeBreakdown: { intro: 5, dev: 20, conc: 5 },
    pedagogyGuidance: 'Play-based, flashcards, concrete realia, drawing, lots of oral interaction, basic 2-word/3-word sentences, minimal writing pressure.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Islamiyat / Tarjuma-tul-Quran', 'Art & Drawing', 'Physical Education'],
  },
  'Class 3': {
    grade: 'Class 3',
    tier: 'primary',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Simple explanations, pictures, charts, group activities, basic reasoning, short structured written tasks.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Art & Drawing'],
  },
  'Class 4': {
    grade: 'Class 4',
    tier: 'primary',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Illustrated charts, step-by-step reasoning, pair activities, vocabulary building, short paragraph writing and basic scientific observations.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Art & Drawing'],
  },
  'Class 5': {
    grade: 'Class 5',
    tier: 'primary',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Transition to upper primary: reasoning questions, guided group work, diagrams, word problems, short composition.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Art & Drawing'],
  },
  'Class 6': {
    grade: 'Class 6',
    tier: 'middle',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Concept building, discussion, examples from Pakistani daily life, pair/group work, short projects, written practice.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Computer Science', 'Art & Drawing'],
  },
  'Class 7': {
    grade: 'Class 7',
    tier: 'middle',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Critical thinking, hands-on demos, flowcharting, daily life applications, structured notebook exercises, interactive discussion.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Computer Science'],
  },
  'Class 8': {
    grade: 'Class 8',
    tier: 'middle',
    defaultDuration: '40 mins (5 + 25 + 10)',
    timeBreakdown: { intro: 5, dev: 25, conc: 10 },
    pedagogyGuidance: 'Bridge to Matric: analytical reasoning, structured essays, laboratory demonstrations, mathematical proofs, concept mapping.',
    subjects: ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat / Tarjuma-tul-Quran', 'Computer Science'],
  },
  'Class 9 (Matric SSC-I)': {
    grade: 'Class 9 (Matric SSC-I)',
    tier: 'matric',
    defaultDuration: '45 mins (5 + 30 + 10)',
    timeBreakdown: { intro: 5, dev: 30, conc: 10 },
    pedagogyGuidance: 'Exam-oriented depth, definitions, derivations, numericals, diagrams, BISE past-paper style questions (MCQs, short and long questions), revision & test-taking skills.',
    subjects: ['English', 'Urdu', 'Islamiyat / Tarjuma-tul-Quran', 'Pakistan Studies', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
  },
  'Class 10 (Matric SSC-II)': {
    grade: 'Class 10 (Matric SSC-II)',
    tier: 'matric',
    defaultDuration: '45 mins (5 + 30 + 10)',
    timeBreakdown: { intro: 5, dev: 30, conc: 10 },
    pedagogyGuidance: 'Intensive BISE Punjab board preparation, exact textbook definitions, formula derivations, numerical problem solving, labelled board diagrams, past paper questions.',
    subjects: ['English', 'Urdu', 'Islamiyat / Tarjuma-tul-Quran', 'Pakistan Studies', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
  },
};

export const EXEMPLAR_LESSON_PLANS: LessonPlan[] = [
  {
    title: "Newton's Second Law of Motion (F = ma) & Numericals",
    grade: 'Class 9 (Matric SSC-I)',
    subject: 'Physics',
    topic: "Newton's Second Law of Motion: Statement, Mathematical Derivation, and Calculation of Force",
    duration: '45 mins (5 + 30 + 10)',
    language: 'English',
    slos: [
      "State and explain Newton's Second Law of Motion in accordance with PTB Chapter 3.",
      "Derive the mathematical relationship F = ma starting from acceleration directly proportional to force and inversely proportional to mass.",
      "Define SI unit of Force (Newton) and solve BISE-standard numerical problems."
    ],
    gradeLevelApproach: "Class 9 Matric depth: strict BISE exam alignment with clear definitions, algebraic derivation on blackboard, SI units, and step-by-step numerical solving.",
    materialsNeeded: [
      "Whiteboard/chalkboard & colored markers",
      "PTB Class 9 Physics Textbook (Chapter 3: Dynamics)",
      "Two plastic toy cars of different weights or a heavy book and a light notebook for demonstration"
    ],
    phases: {
      introduction: {
        duration: '5 mins',
        title: 'Hook & Recapitulation (Reviewing 1st Law)',
        teacherActions: [
          "Ask students: 'What happens when you push a light bicycle vs a heavy rickshaw with the same push?'",
          "Draw connection between unbalanced applied force and produced acceleration."
        ],
        studentActivities: [
          "Students observe that heavier objects need more push to pick up speed.",
          "Recall Newton's First Law (Law of Inertia) from previous lesson."
        ],
        starterQuestionOrRhyme: "If you push an empty shopping cart and a loaded cart with identical effort, which one accelerates faster?"
      },
      development: {
        duration: '30 mins',
        title: 'Formal Statement, Derivation (F=ma) & Numerical Demonstration',
        teacherActions: [
          "State Newton's Second Law: 'When a net force acts on a body, it produces an acceleration in the direction of the force...'",
          "Write derivation on board: a ∝ F, a ∝ 1/m  => a ∝ F/m => F ∝ ma => F = k ma (In SI units k=1, so F = ma).",
          "Define 1 Newton: Force that produces 1 m/s² acceleration in a 1 kg mass body.",
          "Demonstrate worked numerical on board: Finding force needed to accelerate a 2000 kg car at 2 m/s²."
        ],
        studentActivities: [
          "Note down derivation in physics notebooks with proper labels.",
          "Solve guided numerical in pairs: Find acceleration of a 5 kg mass pushed with 20 N."
        ],
        boardSummary: "TOPIC: Newton's 2nd Law | FORMULA: a = F/m => F = ma | UNIT: 1 N = 1 kg·m/s² | GIVEN: m=2000kg, a=2m/s² => F = 4000 N"
      },
      conclusion: {
        duration: '10 mins',
        title: 'BISE Question Formulation & Exit Ticket',
        teacherActions: [
          "Highlight how BISE Lahore/Rawalpindi frames this as a 5-mark long question (Part a: Derivation 3 marks, Part b: Numerical 2 marks).",
          "Distribute 2-minute quick check card."
        ],
        studentActivities: [
          "Write the 1-line definition of Newton and the formula on exit slip."
        ],
        exitTicket: "State what happens to acceleration if mass is doubled while force remains constant."
      }
    },
    subjectSpecific: {
      type: 'science',
      scienceData: {
        experimentOrDemo: {
          title: "Safe Classroom Demo: Force vs Mass on Flat Desk",
          safeMaterials: ["Empty pencil box", "Full heavy pencil box", "Rubber band or ruler to push"],
          procedureSteps: [
            "Place empty box on flat desk; give a gentle flick with finger; observe how far and fast it moves.",
            "Load the box with 5 heavy erasers and stones; flick with the identical finger flick.",
            "Students compare distance and acceleration."
          ],
          scientificPrinciple: "For a constant applied force, larger mass experiences smaller acceleration (inverse proportionality a ∝ 1/m).",
          safetyWarning: "Ensure objects are pushed across the flat desk only; no throwing of objects."
        },
        labelledDiagramDescription: "Draw a rectangular block of mass 'm' on a horizontal plane. Draw a horizontal vector arrow labeled 'Force (F)'. Draw an acceleration arrow in the same direction labeled 'a →'. Annotate with: F = ma.",
        keyTerms: ["Force (F)", "Mass (m)", "Acceleration (a)", "Newton (N)", "Net Force"],
        matricEquationsOrNumericals: "Formula: F = ma. Law: a = F/m. Numerical Example: A force of 100 N acts on a body of mass 20 kg. Calculate acceleration (a = F/m = 100/20 = 5 m/s²)."
      }
    },
    biseMatricCorner: {
      applicable: true,
      targetBoard: "BISE Punjab Pattern (All Boards)",
      frequentPastPaperConcepts: [
        "State Newton's Second Law and derive F = ma (repeated 8 times in past 10 years).",
        "Define 1 Newton force with SI base units (Short Question 2 marks).",
        "Numerical problems involving F = ma from PTB Chapter 3 exercise."
      ],
      commonStudentPitfalls: [
        "Writing F = ma directly without showing the proportionalities (a ∝ F and a ∝ 1/m) and constant k=1.",
        "Forgetting to write the unit (N or kg·m/s²) in the final numerical answer, losing 0.5 marks."
      ],
      sampleBoardQuestions: {
        objectiveMcqs: [
          {
            question: "SI unit of force is:",
            options: ["A) kg·m/s", "B) kg·m/s²", "C) kg/m²", "D) N·m"],
            correct: "B"
          },
          {
            question: "If mass of a body is halved keeping force constant, its acceleration will be:",
            options: ["A) Halved", "B) Doubled", "C) Four times", "D) Unchanged"],
            correct: "B"
          }
        ],
        shortQuestions: [
          "Define the SI unit of force (Newton). (2 Marks)",
          "Why is it dangerous to travel on the roof of a bus? Explain with reference to inertia. (2 Marks)"
        ],
        longQuestion: "Q.5 (a) State Newton's Second Law of Motion and prove that F = ma. (4 Marks)\n(b) A body has weight 20 N. How much force is required to move it vertically upward with an acceleration of 2 m/s²? (Take g = 10 m/s²) (5 Marks)"
      }
    },
    homework: "Learn the statement and derivation of Newton's 2nd Law. Solve numericals 3.1 and 3.2 in physics neat notebook from PTB textbook.",
    differentiatedLearning: {
      forStrugglingStudents: "Provide formula triangle (F on top, m and a on bottom) to easily remember F=m×a, m=F/a, a=F/m.",
      forAdvancedStudents: "Challenge: If a car moving at 20 m/s is brought to rest over 50 meters, find the retarding force given mass = 1000 kg (combining equations of motion with F=ma)."
    }
  },
  {
    title: "اردو لازمی: نظم 'نظم و ضبط' (حفیظ جالندھری)",
    grade: 'Class 8',
    subject: 'Urdu',
    topic: "نظم 'نظم و ضبط' کی تفہیم، تشریح، مشکل الفاظ کے معانی اور مشقی سوالات",
    duration: '40 mins (5 + 25 + 10)',
    language: 'Urdu',
    slos: [
      "طلبہ نظم 'نظم و ضبط' کو درست تلفظ اور روانی سے ترنم کے ساتھ پڑھ سکیں گے۔",
      "مشکل الفاظ کے معانی سمجھ کر اپنے جملوں میں استعمال کر سکیں گے۔",
      "اشعار کا مفہوم و تشریح اور روزمرہ زندگی میں نظم و ضبط کی عملی اہمیت بیان کر سکیں گے۔"
    ],
    gradeLevelApproach: "کلاس ہشتم (Class 8): تدریسی انداز تفہیمی و عملی، روزمرہ عادات سے مثالیں، اجتماعی قرات، اور اردو املا و تشریح پر توجہ۔",
    materialsNeeded: [
      "پنجاب ٹیکسٹ بک بورڈ کی اردو درسی کتاب (برائے جماعت ہشتم)",
      "وائٹ بورڈ اور مارکر",
      "مشکل الفاظ کے فلیش کارڈز"
    ],
    phases: {
      introduction: {
        duration: '5 منٹ',
        title: 'تمہید و سابقہ معلومات کی جانچ (Hook)',
        teacherActions: [
          "معلم کلاس روم میں قطار بنانے اور اشیاء ترتیب سے رکھنے کا عملی مظاہرہ کرائے۔",
          "طلبہ سے دریافت کرے: 'اگر کائنات میں سورج اور چاند وقت کی پابندی نہ کریں تو کیا ہوگا؟'"
        ],
        studentActivities: [
          "طلبہ جواب دیں گے کہ کائنات کا سارا نظام درہم برہم ہو جائے گا۔",
          "روزمرہ زندگی میں اسکول اسمبلی اور ٹریفک اشاروں پر نظم و ضبط کی مثالیں پیش کریں گے۔"
        ],
        starterQuestionOrRhyme: "زندگی میں کامیابی کا راز کس بات میں پوشیدہ ہے؟"
      },
      development: {
        duration: '25 منٹ',
        title: 'بلند خوانی، مشکل الفاظ کی وضاحت اور اشعار کی تشریح',
        teacherActions: [
          "معلم درست تلفظ اور لے کے ساتھ نظم کے پہلے دو بند کی بلند خوانی کرے۔",
          "بورڈ پر مشکل الفاظ لکھ کر طلبہ سے ان کے معانی اخذ کرائے۔",
          "شعر کی تشریح کراتے ہوئے شاعر حفیظ جالندھری کے پیغام کی وضاحت کرے۔"
        ],
        studentActivities: [
          "طلبہ باری باری انفرادی اور گروہی انداز میں قرات کریں۔",
          "مشکل الفاظ کو لغت کے مطابق نوٹ کریں اور زبانی جملے بنائیں。"
        ],
        boardSummary: "عنوان: نظم و ضبط | شاعر: حفیظ جالندھری | مشکل الفاظ: پاسداری (خیال رکھنا)، کارواں (قافلہ)، شعار (طریقہ) | مرکزی خیال: پابندیِ وقت اور قاعدے پر عمل ہی قوموں کی ترقی کا ضامن ہے۔"
      },
      conclusion: {
        duration: '10 منٹ',
        title: 'اعادہ، جائزے کا سوال اور تحریری جائزہ (Exit Ticket)',
        teacherActions: [
          "طلبہ سے نظم کے مرکزی خیال سے متعلق دو مختصر سوالات پوچھے جائیں۔",
          "گھر کا کام بورڈ پر تحریر کیا جائے۔"
        ],
        studentActivities: [
          "طلبہ اپنے الفاظ میں بتائیں کہ انہوں نے آج اپنی کلاس اور گھر کے لیے کیا نیا اصول سیکھا۔"
        ],
        exitTicket: "لفظ 'نظم و ضبط' کو ایک بامقصد جملے میں استعمال کریں۔"
      }
    },
    subjectSpecific: {
      type: 'urdu',
      urduData: {
        tashreehMafhoom: "شاعر کہتے ہیں کہ کائنات کا ہر ذرہ ایک خاص قانون اور ضابطے کے تحت حرکت کر رہا ہے۔ چاند ستاروں سے لے کر چیونٹیوں کی قطار تک سب میں نظم و ضبط پایا جاتا ہے۔ جو قومیں نظم و ضبط کو اپنا شعار بناتی ہیں وہی دنیا میں سربلند ہوتی ہیں۔",
        mushkilAlfaaz: [
          { lafz: "پاسداری", maani: "لحاظ رکھنا / پابندی کرنا", jumla: "ہمیں ملکی قوانین کی پاسداری کرنی چاہیے۔" },
          { lafz: "شعار", maani: "طریقہ / عادت", jumla: "محنت اور سچائی کو اپنا شعار بنائیں۔" },
          { lafz: "کارواں", maani: "قافلہ", jumla: "مسافروں کا کارواں منزل کی طرف رواں دواں تھا۔" },
          { lafz: "شیرازہ بکھرنا", maani: "ترتیب ختم ہونا / تباہ ہونا", jumla: "بے ترتیبی سے قوموں کا شیرازہ بکھر جاتا ہے۔" }
        ],
        qiraatOrWritingTask: "نظم کے پہلے بند کی خوشخط املا اور درست تلفظ (بالخصوص لفظ 'ضَبْط' اور 'شِعَار') کی مشق۔"
      }
    },
    homework: "نظم 'نظم و ضبط' کے پہلے بند کی تشریح اپنے الفاظ میں لکھیں اور دیئے گئے مشکل الفاظ کے جملے بنائیں۔",
    differentiatedLearning: {
      forStrugglingStudents: "الفاظ کے معانی آسان زبان میں دہرائے جائیں اور جوڑی دار طالب علم کی مدد سے املا درست کرائی جائے۔",
      forAdvancedStudents: "طالب علم اسکول میں صفائی اور نظم و ضبط برقرار رکھنے پر 5 تجاویز پر مشتمل مختصر پیراگراف تحریر کرے۔"
    }
  },
  {
    title: "Addition and Subtraction of Unlike Fractions",
    grade: 'Class 5',
    subject: 'Mathematics',
    topic: "Addition and Subtraction of Unlike Fractions using LCM Method (PTB Chapter 3)",
    duration: '40 mins (5 + 25 + 10)',
    language: 'English',
    slos: [
      "Convert unlike fractions into like fractions by finding the Least Common Multiple (LCM) of denominators.",
      "Add and subtract unlike fractions with unlike denominators accurately.",
      "Solve a real-world word problem involving sharing food/items in Pakistani daily context."
    ],
    gradeLevelApproach: "Class 5 Primary: Concrete visual models (fraction bars on board), finding common denominator step-by-step, guided practice, then real-life problem.",
    materialsNeeded: [
      "Whiteboard & colored dry-erase markers",
      "Strips of paper folded into halves, fourths, and eighths",
      "PTB Class 5 Mathematics textbook"
    ],
    phases: {
      introduction: {
        duration: '5 mins',
        title: 'Warm-up: Like vs Unlike Fractions',
        teacherActions: [
          "Display two fractions on board: 1/4 and 3/4 (Like), then 1/2 and 1/3 (Unlike).",
          "Ask: 'Can we directly add 1 piece of a 2-slice pizza and 1 piece of a 3-slice pizza without cutting them into equal slices?'"
        ],
        studentActivities: [
          "Students realize denominators represent slice sizes; different sizes cannot be directly added."
        ],
        starterQuestionOrRhyme: "Before you add the fractions straight, the denominators must have the same weight!"
      },
      development: {
        duration: '25 mins',
        title: 'Worked Example & Step-by-Step LCM Method',
        teacherActions: [
          "Write problem: 1/2 + 1/3 = ?",
          "Step 1: Find LCM of 2 and 3. LCM = 6.",
          "Step 2: Make equivalent fractions with denominator 6: (1×3)/(2×3) = 3/6, and (1×2)/(3×2) = 2/6.",
          "Step 3: Add numerators: (3 + 2)/6 = 5/6.",
          "Demonstrate subtraction: 3/4 - 1/6 (LCM of 4 and 6 is 12). (9 - 2)/12 = 7/12."
        ],
        studentActivities: [
          "Solve guided problem on notebooks: 2/5 + 1/10.",
          "Exchange notebooks with desk partner to check steps."
        ],
        boardSummary: "Rule: 1. Find LCM of denominators | 2. Make equivalent fractions | 3. Add/Subtract numerators | 4. Simplify if possible."
      },
      conclusion: {
        duration: '10 mins',
        title: 'Word Problem Wrap-up & Quick Check',
        teacherActions: [
          "Present the Pakistani daily life word problem.",
          "Check student answers with thumbs up / thumbs down."
        ],
        studentActivities: [
          "Solve the rapid check problem in 2 minutes."
        ],
        exitTicket: "Solve: 1/3 + 1/6. Write in simplest form."
      }
    },
    subjectSpecific: {
      type: 'math',
      mathData: {
        workedExample: {
          problem: "Evaluate: 2/3 + 1/4",
          solutionSteps: [
            "Find LCM of denominators 3 and 4: Multiples of 3 = 3, 6, 9, 12... Multiples of 4 = 4, 8, 12... LCM = 12.",
            "Convert to equivalent fractions with denominator 12: (2 × 4)/(3 × 4) = 8/12, and (1 × 3)/(4 × 3) = 3/12.",
            "Add the numerators over the common denominator: (8 + 3)/12 = 11/12."
          ],
          finalAnswer: "11/12"
        },
        guidedPracticeQuestion: "Solve with the teacher: 5/6 - 1/4 (Hint: What is LCM of 6 and 4?)",
        realLifeProblem: "Ali ate 1/4 of a flatbread (roti) at lunch, and his sister Fatima ate 3/8 of the same roti. How much roti did both eat altogether? How much is left?"
      }
    },
    homework: "Complete Questions 1 to 4 of Exercise 3.2 on Page 45 of your PTB Class 5 Math notebook.",
    differentiatedLearning: {
      forStrugglingStudents: "Use paper strips folded into equal parts so students can visually verify 2/4 is identical to 1/2 before calculating.",
      forAdvancedStudents: "Try a 3-fraction challenge: 1/2 + 1/3 + 1/6 = ?"
    }
  }
];

export const EXEMPLAR_BISE_EXAMS = [
  {
    header: {
      schoolName: 'Government Model Higher Secondary School, Punjab',
      examTitle: 'Mid-Term Assessment / Chapter 1 to 3 Examination',
      board: 'BISE Lahore (Punjab Board Pattern)',
      classGrade: 'Class 9 (Matric SSC-I)',
      subject: 'Physics',
      timeAllowed: '1 Hour 45 Mins',
      totalMarks: 50,
      rollNoPrompt: 'Roll No: ____________',
    },
    instructions: [
      'Write your Roll Number on the Objective Bubble Sheet and Subjective Answer Book.',
      'Cutting, erasing, or using marker over ink is strictly prohibited in the objective section.',
      'Attempt all parts of short questions with clear formula definitions and SI units.',
      'For numerical problems, mention Given Data, Formula, Step-by-Step Calculation, and Unit.',
    ],
    objectiveSection: {
      title: 'PART - I (OBJECTIVE / MCQs)',
      marks: '10 Marks',
      instructions: 'Choose the correct option. Each question carries 1 mark. (10 x 1 = 10 Marks)',
      questions: [
        {
          qNum: 1,
          questionEn: 'One femto is equal to:',
          questionUr: 'ایک فیمٹو (Femto) برابر ہوتا ہے:',
          options: [
            { key: 'A', text: '10^-12' },
            { key: 'B', text: '10^-15' },
            { key: 'C', text: '10^-18' },
            { key: 'D', text: '10^-9' },
          ],
          correctKey: 'B',
          explanation: 'Standard SI prefix: femto (f) = 10^-15.',
        },
        {
          qNum: 2,
          questionEn: 'A train starts from rest. Which of the following is true?',
          questionUr: 'ایک ٹرین سکون کی حالت سے چلتی ہے۔ ان میں سے کون سی بات درست ہے؟',
          options: [
            { key: 'A', text: 'vi = 0' },
            { key: 'B', text: 'vf = 0' },
            { key: 'C', text: 'a = 0' },
            { key: 'D', text: 'S = 0' },
          ],
          correctKey: 'A',
          explanation: 'When an object starts from rest, initial velocity vi = 0.',
        },
        {
          qNum: 3,
          questionEn: 'Newton’s second law of motion gives the relation:',
          questionUr: 'نیوٹن کا موشن کا دوسرا قانون کیا تعلق ظاہر کرتا ہے؟',
          options: [
            { key: 'A', text: 'F = m / a' },
            { key: 'B', text: 'F = ma' },
            { key: 'C', text: 'm = Fa' },
            { key: 'D', text: 'F = a / m' },
          ],
          correctKey: 'B',
          explanation: 'Newton’s 2nd Law states F = ma.',
        },
        {
          qNum: 4,
          questionEn: 'The unit of momentum in SI system is:',
          questionUr: 'انٹرنیشنل سسٹم میں مومینٹم کا یونٹ ہے:',
          options: [
            { key: 'A', text: 'N s' },
            { key: 'B', text: 'N m' },
            { key: 'C', text: 'kg m/s^2' },
            { key: 'D', text: 'J s' },
          ],
          correctKey: 'A',
          explanation: 'SI unit of momentum is kg·m/s which is equivalent to N·s.',
        },
        {
          qNum: 5,
          questionEn: 'The coefficient of friction between tyre and dry road is approximately:',
          questionUr: 'ٹائر اور خشک سڑک کے درمیان رگڑ کا کوایفیشینٹ (μ) تقریباً ہوتا ہے:',
          options: [
            { key: 'A', text: '0.2' },
            { key: 'B', text: '0.6' },
            { key: 'C', text: '1' },
            { key: 'D', text: '0.05' },
          ],
          correctKey: 'C',
          explanation: 'According to PTB Physics Chapter 3 table, μ ≈ 1.',
        },
      ],
    },
    subjectivePart1: {
      title: 'PART - II (SUBJECTIVE - SHORT QUESTIONS)',
      sections: [
        {
          qNumber: 'Q. 2',
          instructions: 'Attempt any 5 questions out of 8. (5 x 2 = 10 Marks)',
          totalAllowed: 5,
          questions: [
            {
              subNum: '(i)',
              questionEn: 'Define least count of Vernier Calipers and write its value in mm and cm.',
              questionUr: 'ورنئیر کیلیپرز کے لیسٹ کاؤنٹ کی تعریف کریں اور اس کی قیمت ملی میٹر اور سینٹی میٹر میں لکھیں۔',
              marks: 2,
              modelAnswerKey: 'Least count = 1 MSD - 1 VSD = 0.1 mm = 0.01 cm.',
            },
            {
              subNum: '(ii)',
              questionEn: 'Differentiate between base quantities and derived quantities with two examples each.',
              questionUr: 'بنیادی اور ماخوذ مقداروں میں فرق واضح کریں اور دو دو مثالیں دیں۔',
              marks: 2,
              modelAnswerKey: 'Base: length, mass, time. Derived: speed, force, work.',
            },
            {
              subNum: '(iii)',
              questionEn: 'Define uniform acceleration and write its mathematical formula.',
              questionUr: 'یکساں ایکسلریشن کی تعریف کریں اور اس کا فارمولا لکھیں۔',
              marks: 2,
              modelAnswerKey: 'Equal changes in velocity in equal intervals of time. a = (vf - vi)/t.',
            },
            {
              subNum: '(iv)',
              questionEn: 'State Newton’s First Law of Motion and why is it called the law of inertia?',
              questionUr: 'نیوٹن کا موشن کا پہلا قانون بیان کریں اور اسے انرشیا کا قانون کیوں کہتے ہیں؟',
              marks: 2,
              modelAnswerKey: 'A body continues in its state of rest or uniform motion unless acted upon by a net force.',
            },
            {
              subNum: '(v)',
              questionEn: 'What is centripetal force? Write its formula and unit.',
              questionUr: 'سینٹری پیٹل فورس سے کیا مراد ہے؟ اس کا فارمولا اور یونٹ تحریر کریں۔',
              marks: 2,
              modelAnswerKey: 'Fc = mv^2 / r. Unit: Newton (N).',
            },
          ],
        },
      ],
    },
    subjectivePart2: {
      title: 'PART - III (LONG / EXTENSIVE QUESTIONS)',
      instructions: 'Attempt any 2 questions. Each question carries 9 marks. (2 x 9 = 18 Marks)',
      questions: [
        {
          qNumber: 'Q. 3',
          totalMarks: 9,
          parts: [
            {
              partLabel: '(a)',
              type: 'Theory / Derivation',
              questionEn: 'State Newton’s Second Law of Motion and derive the mathematical equation F = ma.',
              questionUr: 'نیوٹن کا موشن کا دوسرا قانون بیان کریں اور ریاضیاتی مساوات F = ma اخذ کریں۔',
              marks: 5,
              keyPoints: [
                'Statement: Acceleration is directly proportional to net force and inversely proportional to mass.',
                'Derivation steps: a ∝ F, a ∝ 1/m, a ∝ F/m => F = kma (where k=1 in SI), F = ma.',
              ],
            },
            {
              partLabel: '(b)',
              type: 'Numerical Problem',
              questionEn: 'A car travelling at 20 m/s accelerates uniformly at 2 m/s^2 for 5 seconds. Calculate the distance travelled during this time.',
              questionUr: 'ایک کار جو 20 m/s کی رفتار سے جا رہی ہے، 5 سیکنڈ تک 2 m/s^2 کی یکساں ایکسلریشن سے حرکت کرتی ہے۔ طے کردہ فاصلہ معلوم کریں۔',
              marks: 4,
              keyPoints: [
                'Given: vi = 20 m/s, a = 2 m/s^2, t = 5 s.',
                'Formula: S = vi*t + 0.5*a*t^2.',
                'Calculation: S = (20 * 5) + (0.5 * 2 * 25) = 100 + 25 = 125 meters.',
              ],
            },
          ],
        },
      ],
    },
    examinerMarkingScheme: {
      objectiveKeyTable: [
        { q: 1, ans: 'B' },
        { q: 2, ans: 'A' },
        { q: 3, ans: 'B' },
        { q: 4, ans: 'A' },
        { q: 5, ans: 'C' },
      ],
      generalCheckingInstructions: [
        'Award full 1 mark for correct circle fill; no mark for multiple fills or scratching.',
        'Short questions: 1 mark for correct definition, 1 mark for formula/units/example.',
        'Numericals: 1 mark for Given/To Find, 1 mark for Formula, 1.5 marks for Calculation, 0.5 mark for Correct Unit.',
      ],
    },
  },
];

