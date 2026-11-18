import { SavedResource, LessonPlan, BiseExamPaper, WorksheetData } from '../types';
import { EXEMPLAR_LESSON_PLANS } from '../data/punjabCurriculum';

const STORAGE_KEY = 'taleem_punjab_resource_bank_v1';

export const INITIAL_EXEMPLAR_RESOURCES: SavedResource[] = [
  {
    id: 'res-exemplar-lesson-1',
    type: 'lesson_plan',
    title: "Newton's Second Law of Motion (F = ma) & Numericals",
    grade: 'Class 9 (Matric SSC-I)',
    subject: 'Physics',
    topic: "Newton's Second Law of Motion: Statement, Mathematical Derivation, and Calculation of Force",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    tags: ['Matric', 'BISE Lahore', 'PTB Chapter 3', 'Numericals'],
    notes: 'Standard 45-min lesson plan with F=ma blackboard layout and 2-mark past paper short questions.',
    data: EXEMPLAR_LESSON_PLANS[0],
  },
  {
    id: 'res-exemplar-lesson-2',
    type: 'lesson_plan',
    title: "اردو لازمی: نظم 'نظم و ضبط' (حفیظ جالندھری)",
    grade: 'Class 8',
    subject: 'Urdu',
    topic: "نظم 'نظم و ضبط' کی تفہیم، تشریح، مشکل الفاظ کے معانی اور مشقی سوالات",
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    tags: ['Middle', 'Urdu Nastaliq', 'Tashreeh', 'Mushkil Alfaaz'],
    notes: 'شامل تشریح، مشکل الفاظ بمع معانی اور قرات و املا کی سرگرمی۔',
    data: EXEMPLAR_LESSON_PLANS[1],
  },
  {
    id: 'res-exemplar-worksheet-1',
    type: 'worksheet',
    title: 'Class 5 Mathematics: Fractions Practice & Review Sheet',
    grade: 'Class 5',
    subject: 'Mathematics',
    topic: 'Addition and Subtraction of Unlike Fractions (LCM Method)',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    tags: ['Primary', 'Fractions', 'LCM', 'Flashcards'],
    notes: 'Printable 1-page classroom test with 5 revision flip-cards for student pairs.',
    data: {
      title: 'Class 5 Mathematics: Fractions Practice & Review Sheet',
      grade: 'Class 5',
      subject: 'Mathematics',
      topic: 'Addition and Subtraction of Unlike Fractions',
      sections: [
        {
          sectionTitle: 'Section A: Concept Fill-in-the-Blanks',
          items: [
            { num: 1, prompt: 'Before adding unlike fractions, we must find the ______ of the denominators.', answer: 'Least Common Multiple (LCM)' },
            { num: 2, prompt: 'Fractions that have the same denominator are called ______ fractions.', answer: 'Like' },
            { num: 3, prompt: 'The LCM of denominators 4 and 6 is ______.', answer: '12' },
            { num: 4, prompt: '1/2 is equal to ______ / 8.', answer: '4' }
          ]
        },
        {
          sectionTitle: 'Section B: Solve the Following in Your Notebook',
          items: [
            { num: 1, prompt: 'Evaluate: 2/3 + 1/6 (Show all steps)', answer: '4/6 + 1/6 = 5/6' },
            { num: 2, prompt: 'Evaluate: 5/8 - 1/4 (Show all steps)', answer: '5/8 - 2/8 = 3/8' },
            { num: 3, prompt: 'Word Problem: Asma used 1/3 meter of ribbon for gift packing and 1/2 meter for a school project. What is total length used?', answer: '1/3 + 1/2 = 2/6 + 3/6 = 5/6 meter' }
          ]
        }
      ],
      flashcards: [
        { front: 'What is an Unlike Fraction?', back: 'Fractions with different denominators (e.g., 1/2 and 1/3).', hint: 'Look at the bottom number!' },
        { front: 'How do you find the common denominator?', back: 'By calculating the LCM (Least Common Multiple) of both denominators.', hint: 'LCM method' },
        { front: 'What is 3/4 - 1/4?', back: '2/4 = 1/2 (in simplest form).', hint: 'Like fractions: subtract numerators directly' },
        { front: 'Equivalent Fraction of 2/5 with denominator 15?', back: '6/15 (multiply numerator & denominator by 3).', hint: '2 × 3 / 5 × 3' },
        { front: 'Can you add numerators when denominators are different?', back: 'NO! You must convert them to like fractions first.', hint: 'Essential Fraction Rule' }
      ],
      teacherNotes: 'Common student misconception: Adding both numerators and denominators (e.g. 1/2 + 1/3 = 2/5). Ensure students use paper folding or LCM steps.'
    } as WorksheetData,
  },
  {
    id: 'res-exemplar-exam-1',
    type: 'exam_paper',
    title: 'Class 9 Physics: Dynamics & Kinematics Term Exam',
    grade: 'Class 9 (Matric SSC-I)',
    subject: 'Physics',
    topic: 'Chapter 2 (Kinematics) & Chapter 3 (Dynamics)',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    tags: ['Matric', 'BISE Lahore', '50 Marks', 'Model Paper'],
    notes: 'Complete BISE Punjab pattern with 10 MCQs, Part I Short Questions (5 out of 8), Part II Long Question with Part a theory and Part b numerical.',
    data: {
      header: {
        schoolName: 'Government Model High School / College, Punjab',
        examTitle: 'Monthly Term Assessment',
        board: 'BISE Lahore / Punjab Boards',
        classGrade: 'Class 9 (Matric SSC-I)',
        subject: 'Physics',
        timeAllowed: '1 Hour 45 Mins',
        totalMarks: 50,
        rollNoPrompt: 'Roll No: ____________'
      },
      instructions: [
        'Read each question carefully before answering.',
        'Attempt Objective and Subjective parts in designated sections.',
        'No erasing fluid or overwriting on MCQ bubble answers.'
      ],
      objectiveSection: {
        title: 'PART - I (OBJECTIVE / MCQs)',
        marks: '10 Marks',
        instructions: 'Choose the correct option. Each question carries 1 mark.',
        questions: [
          {
            qNum: 1,
            questionEn: 'The rate of change of displacement is known as:',
            questionUr: 'پوزیشن یا فاصلے میں تبدیلی کی شرح کہلاتی ہے:',
            options: [
              { key: 'A', text: 'Speed' },
              { key: 'B', text: 'Velocity' },
              { key: 'C', text: 'Acceleration' },
              { key: 'D', text: 'Momentum' }
            ],
            correctKey: 'B'
          },
          {
            qNum: 2,
            questionEn: 'Newton is the SI unit of:',
            questionUr: 'نیوٹن کس کا ایس آئی یونٹ ہے:',
            options: [
              { key: 'A', text: 'Mass' },
              { key: 'B', text: 'Force' },
              { key: 'C', text: 'Energy' },
              { key: 'D', text: 'Pressure' }
            ],
            correctKey: 'B'
          }
        ]
      },
      subjectivePart1: {
        title: 'PART - II (SHORT QUESTIONS)',
        sections: [
          {
            qNumber: 'Q. 2',
            instructions: 'Attempt any 5 questions out of 8. (5 x 2 = 10 Marks)',
            totalAllowed: 5,
            questions: [
              {
                subNum: '(i)',
                questionEn: 'Differentiate between scalar and vector quantities with one example each.',
                questionUr: 'سکیلر اور ویکٹر مقداروں میں ایک ایک مثال کے ساتھ فرق واضح کریں۔',
                marks: 2
              },
              {
                subNum: '(ii)',
                questionEn: 'Define inertia and state its relation with mass.',
                questionUr: 'انرشیا کی تعریف کریں اور کمیت کے ساتھ اس کا تعلق بیان کریں۔',
                marks: 2
              }
            ]
          }
        ]
      },
      subjectivePart2: {
        title: 'PART - III (LONG / EXTENSIVE QUESTIONS)',
        instructions: 'Attempt any 2 questions. Each carries 9 marks (Part a = 5, Part b = 4).',
        questions: [
          {
            qNumber: 'Q. 5',
            totalMarks: 9,
            parts: [
              {
                partLabel: '(a)',
                type: 'Theory & Derivation',
                questionEn: 'State Newton\'s Second Law of Motion and prove that F = ma.',
                questionUr: 'نیوٹن کا دوسرا قانونِ حرکت بیان کریں اور ثابت کریں کہ F = ma۔',
                marks: 5,
                keyPoints: ['Statement', 'Acceleration proportionalities', 'Constant k=1', 'Final formula']
              },
              {
                partLabel: '(b)',
                type: 'Numerical Problem',
                questionEn: 'Find the acceleration produced by a force of 100 N on a body of mass 20 kg.',
                questionUr: '20 کلوگرام کمیت والے جسم پر 100 نیوٹن کی فورس کتنا ایکسلریشن پیدا کرے گی؟',
                marks: 4,
                keyPoints: ['Given data: F=100 N, m=20 kg', 'Formula: a = F/m', 'Calculation: a = 100/20 = 5 m/s²']
              }
            ]
          }
        ]
      },
      examinerMarkingScheme: {
        objectiveKeyTable: [
          { q: 1, ans: 'B' },
          { q: 2, ans: 'B' }
        ],
        generalCheckingInstructions: [
          'Award full 2 marks for clear distinction with units.',
          'Step marking applies to physics numericals: Formula 1 mark, substitution 1 mark, answer with unit 2 marks.'
        ]
      }
    } as BiseExamPaper,
  }
];

export function getSavedResources(): SavedResource[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with default exemplar resources
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXEMPLAR_RESOURCES));
      return INITIAL_EXEMPLAR_RESOURCES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load resources from localStorage', e);
    return INITIAL_EXEMPLAR_RESOURCES;
  }
}

export function saveResourceToBank(item: {
  type: SavedResource['type'];
  title: string;
  grade: string;
  subject: string;
  topic: string;
  notes?: string;
  tags?: string[];
  data: LessonPlan | BiseExamPaper | WorksheetData;
}): SavedResource {
  const current = getSavedResources();
  const newResource: SavedResource = {
    id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: item.type,
    title: item.title,
    grade: item.grade,
    subject: item.subject,
    topic: item.topic,
    createdAt: new Date().toISOString(),
    notes: item.notes || '',
    tags: item.tags || [],
    data: item.data,
  };

  const updated = [newResource, ...current];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
  return newResource;
}

export function updateResourceInBank(id: string, updates: Partial<SavedResource>): SavedResource | null {
  const current = getSavedResources();
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updatedResource = {
    ...current[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedResource;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to update resource in localStorage', e);
  }
  return updatedResource;
}

export function deleteResourceFromBank(id: string): boolean {
  const current = getSavedResources();
  const filtered = current.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to delete resource', e);
    return false;
  }
}

export function getResourceById(id: string): SavedResource | null {
  const all = getSavedResources();
  return all.find((r) => r.id === id) || null;
}

export function exportBankToJson(): string {
  const all = getSavedResources();
  return JSON.stringify(
    {
      app: 'Taleem Punjab',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: all.length,
      resources: all,
    },
    null,
    2
  );
}

export function importBankFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const resources = Array.isArray(parsed) ? parsed : parsed.resources;
    if (!Array.isArray(resources)) {
      return { success: false, count: 0, error: 'Invalid JSON format: missing resources array.' };
    }

    const current = getSavedResources();
    const existingIds = new Set(current.map((r) => r.id));

    const validated: SavedResource[] = [];
    for (const item of resources) {
      if (item && item.type && item.title && item.data) {
        // Ensure unique ID if conflict
        const newId = existingIds.has(item.id)
          ? `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
          : item.id || `res-${Date.now()}`;
        validated.push({
          ...item,
          id: newId,
          createdAt: item.createdAt || new Date().toISOString(),
        });
      }
    }

    const merged = [...validated, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: validated.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message || 'Failed to parse JSON file.' };
  }
}

export function resetBankToDefaults(): SavedResource[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXEMPLAR_RESOURCES));
  } catch (e) {
    console.error('Failed to reset localStorage', e);
  }
  return INITIAL_EXEMPLAR_RESOURCES;
}
