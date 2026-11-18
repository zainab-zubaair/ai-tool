import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Server-side Google GenAI initialization with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PUNJAB_SYSTEM_INSTRUCTION = `You are the master educational architect and curriculum expert for the Punjab School Education Department, Punjab Textbook Board (PTCB / PTB), and Boards of Intermediate and Secondary Education (BISE Punjab: Lahore, Rawalpindi, Gujranwala, Faisalabad, Multan, Bahawalpur, Sargodha, Sahiwal, DG Khan).

CRITICAL PEDAGOGICAL & CURRICULUM RULES:
1. SCOPE:
- Handle ALL subjects and ALL classes from Prep / Nursery / Class 1 up to Matric (Class 10).
- Follow Punjab Textbook Board books and Punjab curriculum SLOs (Student Learning Outcomes).
- For Classes 9-10 (Matric), align with the BISE (Punjab) exam pattern: objective (MCQs), short-answer, and long-answer questions (with standard parts a & b, numericals, derivations, laws).

2. GRADE-LEVEL ADAPTATION:
- Prep to Class 2: very simple language, play-based and activity-based learning, songs/rhymes, flashcards, physical objects, drawing, lots of oral work. Short activities (5-10 mins each). Minimal writing.
- Class 3 to 5: simple explanations, pictures, charts, group activities, basic reasoning. Short written tasks.
- Class 6 to 8: concept building, discussion, examples from daily life, pair/group work, short projects, written practice.
- Class 9 to 10 (Matric): exam-oriented depth, definitions, derivations, numericals, diagrams, past-paper style questions (MCQs, short and long questions), revision and test-taking skills.

3. SUBJECT-SPECIFIC RULES:
- English: include skill focus (reading, writing, speaking, listening, grammar), vocabulary list with meanings, and one sentence-making or writing task.
- Urdu: write in authentic, elegant Urdu (اردو) if requested or if topic is in Urdu. Include Tashreeh/Mafhoom (تشریح / مفہوم), Mushkil Alfaaz (مشکل الفاظ و معانی), and a writing or Qiraat (تلفظ / قرات) activity.
- Mathematics: always include one worked example with clear steps, one guided practice question, and one real-life problem from Pakistani context. For Matric: include formula/theorem derivation steps and exercise-type questions.
- General Science / Physics / Chemistry / Biology: include a safe demonstration or simple experiment (with safe, easily available classroom/household materials), a labelled diagram/chart description, and key terms. For Matric: include laws, equations, numerical problems, and reasoning short questions.
- Social Studies / Pakistan Studies / History / Geography / Civics: include a map, timeline or chart guidance, cause-and-effect points, and a critical discussion question.
- Islamiyat / Nazra / Quran: include the relevant ayat/hadith or topic with correct reference ONLY if given by the teacher or visible in the photo; otherwise explicitly state "Reference to be verified by teacher". NEVER guess or alter religious text. Include a moral and practical everyday life lesson.
- Computer Science: include a practical/hands-on task and key terms. If no computer lab is available, provide a concrete board/paper-based alternative.
- Art, Drawing, Physical Education, Moral Education: activity-based with materials list; assessment through observation and performance rubrics.
- Any other subject: apply the closest pattern above and keep the sheet format.

4. TIME DEFAULTS (use only if teacher gives no duration):
- Prep to Class 2: 30 mins (5 min Hook/Warm-up + 20 min Play/Activity + 5 min Oral Wrap-up)
- Class 3 to 8: 40 mins (5 min Review/Hook + 25 min Concept & Group Work + 10 min Assessment/Wrap-up)
- Class 9 to 10: 40-45 mins (5 min Recapitulation + 28-30 min Deep Lesson & Numericals + 7-10 min Board-Style Questions & Exit Ticket)

5. ACCURACY AND SAFETY:
- Never invent textbook page numbers, exercise numbers, or curriculum codes. Use them only if visible in the photo or given by the teacher.
- If a topic is not part of the stated class level, say so politely in 'curriculumNotice' and provide the plan for the closest correct level.
- For science activities, NEVER suggest anything unsafe (no hazardous chemicals, no open flame without supervision, only safe everyday materials).`;

// In-memory high-speed cache for instant response times
const planCache = new Map<string, any>();
const examCache = new Map<string, any>();
const worksheetCache = new Map<string, any>();
const photoCache = new Map<string, any>();

// Helper to call fast Gemini models with automatic fallback
async function callGeminiFast(
  contents: any,
  systemInstruction: string,
  responseMimeType = 'application/json',
  maxOutputTokens = 3800
): Promise<string> {
  // Use gemini-3.1-flash-lite for lowest latency token generation, fallback to gemini-flash-latest and gemini-3.8-flash
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastErr: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType,
          temperature: 0.2,
          maxOutputTokens,
        },
      });

      if (response && typeof response.text === 'string') {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Speed fallback: ${model} failed, trying next candidate:`, err?.message || err);
      lastErr = err;
    }
  }

  throw lastErr || new Error('Failed to generate content with available Gemini models.');
}

// Endpoint 1: Generate Lesson Plan
app.post('/api/generate-lesson-plan', async (req: Request, res: Response) => {
  try {
    const {
      grade,
      subject,
      topic,
      duration,
      language = 'English',
      textbookInfo,
      additionalNotes,
      imageBase64,
      imageMimeType,
      forceFresh = true,
    } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Please enter a specific lesson topic to generate a lesson plan.' });
    }

    if (!grade || !subject) {
      return res.status(400).json({ error: 'Grade and Subject are required.' });
    }

    const trimmedTopic = topic.trim();

    // Cache handling: when forceFresh is true, purge any prior cache to guarantee no stale contamination
    const cacheKey = `${grade}|${subject}|${trimmedTopic.toLowerCase()}|${language}|${duration || ''}`.toLowerCase();
    if (forceFresh) {
      planCache.delete(cacheKey);
    } else if (!imageBase64 && planCache.has(cacheKey)) {
      const cachedPlan = planCache.get(cacheKey);
      if (cachedPlan && cachedPlan.topic && cachedPlan.topic.toLowerCase().trim() === trimmedTopic.toLowerCase()) {
        return res.json({ success: true, plan: cachedPlan, cached: true });
      } else {
        planCache.delete(cacheKey);
      }
    }

    const promptText = `CRITICAL TOPIC DIRECTIVE:
Generate the lesson plan specifically and exclusively for the exact topic provided by the user: "${trimmedTopic}".
Do not introduce a different subject or unrelated topic. Every section of the generated lesson plan (title, SLOs, materials, hook, development, activities, board summary, conclusion, exit ticket, subject-specific data, and homework) MUST remain strictly and directly relevant to "${trimmedTopic}".
The user's topic "${trimmedTopic}" is the primary input and has the highest priority over all other defaults or generic examples.

Teacher Specifications:
- Target Topic: ${trimmedTopic}
- Class/Grade: ${grade}
- Subject: ${subject}
- Requested Duration: ${duration || 'Use standard default for this grade level'}
- Language for plan: ${language} (If Urdu or subject is Urdu/Islamiyat, provide relevant pedagogical text in Urdu Nastaliq)
- Textbook page / Exercise info from teacher: ${textbookInfo || 'None specified by teacher (DO NOT INVENT page numbers)'}
- Teacher special instructions: ${additionalNotes || 'None'}

Return ONLY a valid JSON object matching the exact schema below, where every single field is custom-crafted specifically for "${trimmedTopic}":
{
  "title": "${trimmedTopic}",
  "grade": "${grade}",
  "subject": "${subject}",
  "topic": "${trimmedTopic}",
  "duration": "e.g. 40 minutes (5 + 25 + 10)",
  "language": "${language}",
  "curriculumNotice": "Empty string or polite note if topic is typically taught in a different grade with suggested adjustment",
  "slos": [
    "By the end of this lesson on ${trimmedTopic}, students will be able to...",
    "..."
  ],
  "gradeLevelApproach": "How the pedagogy is adapted specifically for ${grade} (play-based, concrete, concept-building, or BISE exam depth)",
  "materialsNeeded": ["chalk/marker", "flashcards", "textbook", "..."],
  "phases": {
    "introduction": {
      "duration": "e.g. 5 mins",
      "title": "Hook & Prior Knowledge Activation",
      "teacherActions": ["Step 1...", "Step 2..."],
      "studentActivities": ["Response...", "..."],
      "starterQuestionOrRhyme": "Engaging hook question or rhyme"
    },
    "development": {
      "duration": "e.g. 25 mins",
      "title": "Core Concept Delivery & Guided Practice",
      "teacherActions": ["Teaching step 1...", "Step 2...", "Board work..."],
      "studentActivities": ["Pair work...", "Solving...", "Hands-on activity..."],
      "boardSummary": "What goes on the blackboard/whiteboard (headings, diagrams, formulas)"
    },
    "conclusion": {
      "duration": "e.g. 10 mins",
      "title": "Evaluation, Wrap-Up & Exit Ticket",
      "teacherActions": ["Checking comprehension...", "..."],
      "studentActivities": ["Quick quiz / verbal answer...", "..."],
      "exitTicket": "Quick check for understanding question or task"
    }
  },
  "subjectSpecific": {
    "type": "english | urdu | math | science | social_studies | islamiyat | computer_science | arts_pe | general",
    "englishData": {
      "skillFocus": ["Reading", "Grammar", "..."],
      "vocabularyList": [{"word": "Word", "meaning": "Meaning in simple terms", "example": "Sentence"}],
      "writingTask": "Sentence making or short paragraph prompt"
    },
    "urduData": {
      "tashreehMafhoom": "تشریح یا مرکزی خیال",
      "mushkilAlfaaz": [{"lafz": "لفظ", "maani": "معنی", "jumla": "جملہ"}],
      "qiraatOrWritingTask": "تلفظ، املا یا تحریری سرگرمی"
    },
    "mathData": {
      "workedExample": {
        "problem": "Clear problem statement",
        "solutionSteps": ["Step 1...", "Step 2...", "Step 3..."],
        "finalAnswer": "Result with units"
      },
      "guidedPracticeQuestion": "Question for teacher & students to solve together",
      "realLifeProblem": "Realistic Pakistani everyday life scenario",
      "matricDerivationsOrTheorems": "Formula derivation or theorem statement if Class 9-10"
    },
    "scienceData": {
      "experimentOrDemo": {
        "title": "Classroom Demo / Safe Activity",
        "safeMaterials": ["Water", "Salt", "Plastic cup", "..."],
        "procedureSteps": ["Step 1...", "Step 2..."],
        "scientificPrinciple": "Why this happens",
        "safetyWarning": "Safety guidelines for this grade"
      },
      "labelledDiagramDescription": "Detailed guide on how to draw and label the diagram on the board",
      "keyTerms": ["Definition 1", "Definition 2"],
      "matricEquationsOrNumericals": "Laws, chemical equations, or numerical formulas if Class 9-10"
    },
    "socialStudiesData": {
      "mapTimelineOrChart": "Directions for map work, historical timeline, or flowchart",
      "causeAndEffect": [{"cause": "Historical or social cause", "effect": "Outcome / Impact"}],
      "discussionPrompt": "Classroom debate or critical thinking question"
    },
    "islamiyatData": {
      "ayatOrHadith": "Text if teacher provided; otherwise state 'Reference to be verified by teacher'",
      "referenceStatus": "Verified by teacher OR 'Reference to be verified by teacher - never alter religious texts'",
      "translationMafhoom": "مفہوم و ترجمہ",
      "moralAndPracticalLesson": "How students implement this in their daily life and character building",
      "respectfulQiraatGuidance": "Pronunciation and adab of recitation"
    },
    "computerData": {
      "labTask": "Hands-on computer exercise",
      "zeroLabAlternative": "Board / Notebook / Paper-based alternative when computer lab is unavailable",
      "keyTerms": ["Term 1", "Term 2"]
    },
    "artsPeData": {
      "materials": ["Pencil", "Crayons", "..."],
      "steps": ["Step 1", "Step 2"],
      "observationRubric": ["Observation criterion 1", "Criterion 2"]
    }
  },
  "biseMatricCorner": {
    "applicable": true or false (true only for Class 9 and 10),
    "targetBoard": "BISE Punjab Pattern",
    "frequentPastPaperConcepts": ["Past paper trend 1", "Trend 2"],
    "commonStudentPitfalls": ["Common mistake in board exams", "..."],
    "sampleBoardQuestions": {
      "objectiveMcqs": [
        {"question": "MCQ Question?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A"}
      ],
      "shortQuestions": ["Short question 1 (2 marks)?", "Short question 2 (2 marks)?"],
      "longQuestion": "Extensive question (4 or 5 marks with parts a/b)?"
    }
  },
  "homework": "Appropriate homework task according to grade level",
  "differentiatedLearning": {
    "forStrugglingStudents": "Support strategy / visual scaffold",
    "forAdvancedStudents": "Extension task / challenge problem"
  }
}`;

    const parts: any[] = [];
    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
      parts.push({
        text: `The teacher has uploaded a photo of the textbook page/notes/syllabus above. Please inspect any visible headings, diagrams, or questions carefully. Never fabricate page numbers; only use what is clearly visible.\n\n${promptText}`,
      });
    } else {
      parts.push({ text: promptText });
    }

    const rawText = await callGeminiFast(
      imageBase64 && imageMimeType ? { parts } : promptText,
      PUNJAB_SYSTEM_INSTRUCTION,
      'application/json',
      3800
    );

    const plan = JSON.parse(rawText || '{}');
    plan.topic = trimmedTopic;
    if (!plan.title || !plan.title.trim()) {
      plan.title = trimmedTopic;
    }

    // Save to cache for instant future loads (up to 150 items)
    if (!imageBase64 && plan?.title) {
      if (planCache.size > 150) {
        const firstKey = planCache.keys().next().value;
        if (firstKey) planCache.delete(firstKey);
      }
      planCache.set(cacheKey, plan);
    }

    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('Error generating lesson plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate lesson plan.' });
  }
});

// Endpoint 2: Generate BISE Punjab Exam Paper
app.post('/api/generate-bise-exam', async (req: Request, res: Response) => {
  try {
    const {
      grade,
      subject,
      topicOrChapters,
      biseBoard = 'BISE Punjab (All Boards)',
      examType = 'Chapter Assessment',
      totalMarks = 50,
      timeAllowed = '1 Hour 45 Mins',
      schoolName = 'Punjab Model High School / College',
      medium = 'Both (English & Urdu)',
    } = req.body;

    // Fast Cache Check for Exam Paper
    const examCacheKey = `${grade}|${subject}|${(topicOrChapters || '').trim().toLowerCase()}|${totalMarks}|${examType}|${biseBoard}|${medium}`.toLowerCase();
    if (examCache.has(examCacheKey)) {
      return res.json({ success: true, paper: examCache.get(examCacheKey), cached: true });
    }

    const promptText = `Generate an authentic, examination-hall ready BISE Punjab Board Exam Question Paper and Marking Scheme.
Exam Parameters:
- Class/Grade: ${grade}
- Subject: ${subject}
- Chapter/Topic Syllabus: ${topicOrChapters}
- Board: ${biseBoard}
- Exam Type: ${examType}
- Total Marks: ${totalMarks}
- Time Allowed: ${timeAllowed}
- School / Institution: ${schoolName}
- Medium: ${medium}

Follow the official BISE Punjab examination pattern strictly:
For Class 9-10 (Matric):
- PART I: Objective (MCQs) with 4 options each, bubble-sheet instructions, and answer key.
- PART II: Subjective Part-I (Short Questions) divided into standard Question blocks (e.g. Q2, Q3) with "Attempt any 5 out of 8 questions".
- PART III: Subjective Part-II (Long / Extensive Questions) with standard format: "Attempt any 2 questions. Each question carries marks divided into (a) Theory and (b) Numerical / Application / Practical / Verse Tashreeh".
For Classes 1-8:
- Adapt proportionally to the grade level (e.g., simpler MCQs/Blanks, short questions, descriptive/creative tasks).

Return ONLY a valid JSON object matching this schema:
{
  "header": {
    "schoolName": "${schoolName}",
    "examTitle": "${examType}",
    "board": "${biseBoard}",
    "classGrade": "${grade}",
    "subject": "${subject}",
    "timeAllowed": "${timeAllowed}",
    "totalMarks": ${totalMarks},
    "rollNoPrompt": "Roll No: ____________"
  },
  "instructions": [
    "Read each question carefully before answering.",
    "Cutting, overwriting, or using erasing fluid in objective part is strictly prohibited.",
    "Attempt required number of questions as specified in each section."
  ],
  "objectiveSection": {
    "title": "PART - I (OBJECTIVE / MCQs)",
    "marks": "e.g. 10 or 12 Marks",
    "instructions": "Choose the correct option. Each question carries 1 mark.",
    "questions": [
      {
        "qNum": 1,
        "questionEn": "English question text",
        "questionUr": "اردو متن (if bilingual or Urdu/Islamiyat/Pak Studies)",
        "options": [
          {"key": "A", "text": "Option A"},
          {"key": "B", "text": "Option B"},
          {"key": "C", "text": "Option C"},
          {"key": "D", "text": "Option D"}
        ],
        "correctKey": "A",
        "explanation": "Brief reasoning / textbook SLO link"
      }
    ]
  },
  "subjectivePart1": {
    "title": "PART - II (SHORT QUESTIONS)",
    "sections": [
      {
        "qNumber": "Q. 2",
        "instructions": "Attempt any 5 questions out of 8. (5 x 2 = 10 Marks)",
        "totalAllowed": 5,
        "questions": [
          {
            "subNum": "(i)",
            "questionEn": "Short question in English",
            "questionUr": "مختصر سوال اردو میں",
            "marks": 2,
            "modelAnswerKey": "Model answer points expected by board examiner"
          }
        ]
      }
    ]
  },
  "subjectivePart2": {
    "title": "PART - III (LONG / EXTENSIVE QUESTIONS)",
    "instructions": "Attempt any 2 questions. Each carries equal marks.",
    "questions": [
      {
        "qNumber": "Q. 5",
        "totalMarks": 9,
        "parts": [
          {
            "partLabel": "(a)",
            "type": "Theory / Definition / Derivation / Law",
            "questionEn": "Extensive theory question in English",
            "questionUr": "تفصیلی سوال اردو میں",
            "marks": 5,
            "keyPoints": ["Point 1...", "Point 2..."]
          },
          {
            "partLabel": "(b)",
            "type": "Numerical / Problem / Diagram / Application",
            "questionEn": "Numerical problem or secondary part",
            "questionUr": "عددی سوال یا عملی جز",
            "marks": 4,
            "keyPoints": ["Given data...", "Formula...", "Calculation...", "Unit..."]
          }
        ]
      }
    ]
  },
  "examinerMarkingScheme": {
    "objectiveKeyTable": [{"q": 1, "ans": "A"}],
    "generalCheckingInstructions": ["Standard BISE rubric guidelines...", "Step-marking for math/physics numericals..."]
  }
}`;

    const rawText = await callGeminiFast(promptText, PUNJAB_SYSTEM_INSTRUCTION, 'application/json', 3900);
    const paper = JSON.parse(rawText || '{}');

    if (paper?.header) {
      if (examCache.size > 100) {
        const firstKey = examCache.keys().next().value;
        if (firstKey) examCache.delete(firstKey);
      }
      examCache.set(examCacheKey, paper);
    }

    return res.json({ success: true, paper });
  } catch (err: any) {
    console.error('Error generating BISE exam:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate exam paper.' });
  }
});

// Endpoint 3: Analyze Textbook Page Image / Photo
app.post('/api/analyze-page-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, imageMimeType, grade, subject } = req.body;
    if (!imageBase64 || !imageMimeType) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    // Hash check for repeat scans
    const photoKey = `${imageBase64.length}_${imageBase64.slice(0, 40)}`;
    if (photoCache.has(photoKey)) {
      return res.json({ success: true, analysis: photoCache.get(photoKey), cached: true });
    }

    const promptText = `Analyze this Punjab Textbook Board (PTB) or student notebook/handwritten page carefully.
Teacher Context: Grade ${grade || 'Unknown'}, Subject ${subject || 'Unknown'}.

Extract ONLY what is genuinely visible. Never guess or fabricate textbook page numbers or exercise numbers.
Return a valid JSON object:
{
  "detectedTopic": "Title/Topic detected on the page",
  "detectedSubject": "Subject if identifiable",
  "detectedClassLevel": "Estimated class/grade level",
  "visiblePageNumber": "Page number if clearly visible, otherwise null",
  "visibleExerciseNumber": "Exercise number if clearly visible, otherwise null",
  "keyConceptsOnPage": ["Concept 1", "Concept 2"],
  "summaryOfContent": "Short summary of the text or figures on this page",
  "suggestedLearningOutcomes": ["SLO 1", "SLO 2"],
  "recommendedClassActivity": "Quick safe activity tailored for this lesson",
  "transcribedText": "Important heading and text excerpts in English or Urdu"
}`;

    const parts = [
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      },
      { text: promptText },
    ];

    const raw = await callGeminiFast({ parts }, PUNJAB_SYSTEM_INSTRUCTION, 'application/json', 2500);
    const analysis = JSON.parse(raw || '{}');

    if (analysis?.detectedTopic) {
      if (photoCache.size > 80) {
        const firstKey = photoCache.keys().next().value;
        if (firstKey) photoCache.delete(firstKey);
      }
      photoCache.set(photoKey, analysis);
    }

    return res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('Error analyzing photo:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze page photo.' });
  }
});

// Endpoint 4: Generate Quick Classroom Worksheet / Flashcards
app.post('/api/generate-worksheet', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, worksheetType = 'mixed' } = req.body;

    const wsKey = `${grade}|${subject}|${(topic || '').trim().toLowerCase()}|${worksheetType}`.toLowerCase();
    if (worksheetCache.has(wsKey)) {
      return res.json({ success: true, worksheet: worksheetCache.get(wsKey), cached: true });
    }

    const promptText = `Create a printable 1-page student classroom practice sheet for Punjab curriculum:
Class: ${grade}
Subject: ${subject}
Topic: ${topic}
Type: ${worksheetType}

Include:
1. Student Name & Roll No header
2. Fill-in-the-blanks / Matching / True-False suitable for this grade
3. 3-4 Short questions / concept checks
4. Flashcard deck (5 quick question/answer pairs for revision)
5. Answer key for the teacher at the bottom

Return ONLY a valid JSON object:
{
  "title": "Worksheet Title",
  "grade": "${grade}",
  "subject": "${subject}",
  "topic": "${topic}",
  "sections": [
    {
      "sectionTitle": "Section A: Concept Check (Fill in the blanks / True False)",
      "items": [
        {"num": 1, "prompt": "Question prompt with ______ blank", "answer": "Answer"}
      ]
    },
    {
      "sectionTitle": "Section B: Short Conceptual Questions",
      "items": [
        {"num": 1, "prompt": "Question prompt", "answer": "Model answer"}
      ]
    }
  ],
  "flashcards": [
    {"front": "Question or Term", "back": "Answer or Meaning", "hint": "Memory hook"}
  ],
  "teacherNotes": "Quick teaching tip or common misconception to watch out for"
}`;

    const raw = await callGeminiFast(promptText, PUNJAB_SYSTEM_INSTRUCTION, 'application/json', 3000);
    const worksheet = JSON.parse(raw || '{}');

    if (worksheet?.title) {
      if (worksheetCache.size > 100) {
        const firstKey = worksheetCache.keys().next().value;
        if (firstKey) worksheetCache.delete(firstKey);
      }
      worksheetCache.set(wsKey, worksheet);
    }

    return res.json({ success: true, worksheet });
  } catch (err: any) {
    console.error('Error generating worksheet:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate worksheet.' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Taleem Punjab server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
