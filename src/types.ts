export type GradeLevel =
  | 'Prep / Nursery'
  | 'Class 1'
  | 'Class 2'
  | 'Class 3'
  | 'Class 4'
  | 'Class 5'
  | 'Class 6'
  | 'Class 7'
  | 'Class 8'
  | 'Class 9 (Matric SSC-I)'
  | 'Class 10 (Matric SSC-II)';

export type SubjectType =
  | 'English'
  | 'Urdu'
  | 'Mathematics'
  | 'General Science'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Pakistan Studies'
  | 'Islamiyat / Tarjuma-tul-Quran'
  | 'Social Studies'
  | 'Computer Science'
  | 'Art & Drawing'
  | 'Physical Education';

export interface LessonPlan {
  title: string;
  grade: string;
  subject: string;
  topic: string;
  duration: string;
  language: string;
  curriculumNotice?: string;
  slos: string[];
  gradeLevelApproach: string;
  materialsNeeded: string[];
  phases: {
    introduction: {
      duration: string;
      title: string;
      teacherActions: string[];
      studentActivities: string[];
      starterQuestionOrRhyme?: string;
    };
    development: {
      duration: string;
      title: string;
      teacherActions: string[];
      studentActivities: string[];
      boardSummary?: string;
    };
    conclusion: {
      duration: string;
      title: string;
      teacherActions: string[];
      studentActivities: string[];
      exitTicket?: string;
    };
  };
  subjectSpecific: {
    type: 'english' | 'urdu' | 'math' | 'science' | 'social_studies' | 'islamiyat' | 'computer_science' | 'arts_pe' | 'general';
    englishData?: {
      skillFocus: string[];
      vocabularyList: Array<{ word: string; meaning: string; example?: string }>;
      writingTask: string;
    };
    urduData?: {
      tashreehMafhoom: string;
      mushkilAlfaaz: Array<{ lafz: string; maani: string; jumla?: string }>;
      qiraatOrWritingTask: string;
    };
    mathData?: {
      workedExample: {
        problem: string;
        solutionSteps: string[];
        finalAnswer: string;
      };
      guidedPracticeQuestion: string;
      realLifeProblem: string;
      matricDerivationsOrTheorems?: string;
    };
    scienceData?: {
      experimentOrDemo: {
        title: string;
        safeMaterials: string[];
        procedureSteps: string[];
        scientificPrinciple: string;
        safetyWarning: string;
      };
      labelledDiagramDescription: string;
      keyTerms: string[];
      matricEquationsOrNumericals?: string;
    };
    socialStudiesData?: {
      mapTimelineOrChart: string;
      causeAndEffect: Array<{ cause: string; effect: string }>;
      discussionPrompt: string;
    };
    islamiyatData?: {
      ayatOrHadith: string;
      referenceStatus: string;
      translationMafhoom: string;
      moralAndPracticalLesson: string;
      respectfulQiraatGuidance: string;
    };
    computerData?: {
      labTask: string;
      zeroLabAlternative: string;
      keyTerms: string[];
    };
    artsPeData?: {
      materials: string[];
      steps: string[];
      observationRubric: string[];
    };
  };
  biseMatricCorner?: {
    applicable: boolean;
    targetBoard?: string;
    frequentPastPaperConcepts?: string[];
    commonStudentPitfalls?: string[];
    sampleBoardQuestions?: {
      objectiveMcqs?: Array<{ question: string; options: string[]; correct: string }>;
      shortQuestions?: string[];
      longQuestion?: string;
    };
  };
  homework: string;
  differentiatedLearning?: {
    forStrugglingStudents: string;
    forAdvancedStudents: string;
  };
}

export interface BiseExamPaper {
  header: {
    schoolName: string;
    examTitle: string;
    board: string;
    classGrade: string;
    subject: string;
    timeAllowed: string;
    totalMarks: number;
    rollNoPrompt: string;
  };
  instructions: string[];
  objectiveSection: {
    title: string;
    marks: string;
    instructions: string;
    questions: Array<{
      qNum: number;
      questionEn: string;
      questionUr?: string;
      options: Array<{ key: string; text: string }>;
      correctKey: string;
      explanation?: string;
    }>;
  };
  subjectivePart1: {
    title: string;
    sections: Array<{
      qNumber: string;
      instructions: string;
      totalAllowed: number;
      questions: Array<{
        subNum: string;
        questionEn: string;
        questionUr?: string;
        marks: number;
        modelAnswerKey?: string;
      }>;
    }>;
  };
  subjectivePart2: {
    title: string;
    instructions: string;
    questions: Array<{
      qNumber: string;
      totalMarks: number;
      parts: Array<{
        partLabel: string;
        type: string;
        questionEn: string;
        questionUr?: string;
        marks: number;
        keyPoints: string[];
      }>;
    }>;
  };
  examinerMarkingScheme: {
    objectiveKeyTable: Array<{ q: number; ans: string }>;
    generalCheckingInstructions: string[];
  };
}

export interface WorksheetData {
  title: string;
  grade: string;
  subject: string;
  topic: string;
  sections: Array<{
    sectionTitle: string;
    items: Array<{ num: number; prompt: string; answer: string }>;
  }>;
  flashcards: Array<{
    front: string;
    back: string;
    hint?: string;
  }>;
  teacherNotes: string;
}

export type ResourceType = 'lesson_plan' | 'exam_paper' | 'worksheet';

export interface SavedResource {
  id: string;
  type: ResourceType;
  title: string;
  grade: string;
  subject: string;
  topic: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  notes?: string;
  data: LessonPlan | BiseExamPaper | WorksheetData;
}
