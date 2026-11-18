import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Clock,
  Printer,
  Copy,
  Check,
  Share2,
  FileText,
  AlertTriangle,
  Lightbulb,
  Layers,
  ChevronDown,
  Award,
  Timer,
  Beaker,
  ShieldAlert,
  ArrowRight,
  Download,
  HelpCircle,
  FolderPlus,
  Camera,
  Upload,
  Zap
} from 'lucide-react';
import { GradeLevel, LessonPlan, SubjectType } from '../types';
import { GRADE_CONFIGS, EXEMPLAR_LESSON_PLANS, BISE_BOARDS } from '../data/punjabCurriculum';
import { saveResourceToBank } from '../utils/resourceBank';
import { exportElementToPdf, triggerPrintOrPdf, sanitizeFilename } from '../utils/pdfExport';
import { downloadTextAsFile } from '../utils/fileDownload';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { PunjabSchoolLessonPlanSheet } from './PunjabSchoolLessonPlanSheet';

interface LessonPlannerViewProps {
  onOpenTimer: (gradeTier: 'early' | 'primary' | 'middle' | 'matric', title?: string) => void;
  onOpenScanner: (initialMode?: 'camera' | 'mobile' | 'upload') => void;
  externalPrefill?: {
    topic: string;
    grade?: GradeLevel;
    subject?: SubjectType;
    textbookInfo?: string;
    additionalNotes?: string;
    imageBase64?: string;
    imageMimeType?: string;
  } | null;
  initialPlanToEdit?: LessonPlan | null;
  onSaveToBank?: () => void;
}

export const LessonPlannerView: React.FC<LessonPlannerViewProps> = ({
  onOpenTimer,
  onOpenScanner,
  externalPrefill,
  initialPlanToEdit,
  onSaveToBank,
}) => {
  const defaultPlan = EXEMPLAR_LESSON_PLANS[0];
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(defaultPlan.grade as GradeLevel);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>(defaultPlan.subject as SubjectType);
  const [topic, setTopic] = useState<string>(defaultPlan.topic);
  const [duration, setDuration] = useState<string>(defaultPlan.duration);
  const [language, setLanguage] = useState<'English' | 'Urdu' | 'Bilingual'>('English');
  const [textbookInfo, setTextbookInfo] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<LessonPlan | null>(defaultPlan);
  const [copied, setCopied] = useState(false);
  const [whatsAppCopied, setWhatsAppCopied] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [savedToBank, setSavedToBank] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfSaved, setPdfSaved] = useState(false);
  const [viewLayout, setViewLayout] = useState<'punjab-school-sheet' | 'detailed'>('punjab-school-sheet');
  const [error, setError] = useState<string | null>(null);

  // Concurrency & isolation guards: ensures zero contamination across rapid submissions
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Live elapsed counter for fast feedback during generation
  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedTimer(0);
      interval = setInterval(() => {
        setElapsedTimer((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Suggested topics per subject for quick teacher selection
  const topicSuggestions: Record<string, string[]> = {
    Physics: [
      "Newton's Second Law of Motion (F=ma) & Numericals",
      "Work, Kinetic Energy and Potential Energy",
      "Ohm's Law and Resistance in Series & Parallel",
      "Pascal's Law and Hydraulic Lift Application",
      "Gravitational Law and Mass of Earth Calculation"
    ],
    Biology: [
      "Mechanism of Breathing & Gas Exchange in Humans",
      "Structure and Function of Human Heart",
      "Photosynthesis: Light and Dark Reactions",
      "Structure of DNA & Watson-Crick Model",
      "Enzyme Action: Lock and Key Model"
    ],
    Chemistry: [
      "Bohr's Atomic Model and Electronic Configuration",
      "Periodic Table: Trends in Electronegativity & Ionization Energy",
      "Types of Chemical Bonds: Ionic vs Covalent",
      "Molarity and Preparation of Standard Solutions",
      "Corrosion and its Prevention (Rusting of Iron)"
    ],
    Mathematics: [
      "Quadratic Equations by Factorization and Formula",
      "Matrices: Cramer's Rule and Matrix Inversion",
      "Pythagoras Theorem and its Geometric Proof",
      "Addition and Subtraction of Unlike Fractions (LCM Method)",
      "Trigonometric Ratios for Right-Angled Triangles"
    ],
    English: [
      "Active and Passive Voice in Past Indefinite Tense",
      "Reading Comprehension: 'Daffodils' by William Wordsworth",
      "Direct and Indirect Speech: Assertive Sentences",
      "Vocabulary & Sentence Making: Action Verbs",
      "Formal Letter Writing to the School Principal"
    ],
    Urdu: [
      "نظم: نظم و ضبط (شاعر: حفیظ جالندھری)",
      "سبق: نظریہ پاکستان (ڈاکٹر غلام مصطفیٰ خان)",
      "قواعد: اسم معرفہ اور اسم نکرہ کی اقسام",
      "خط نویسی: دوست کے نام امتحانات میں کامیابی پر مبارکباد",
      "غزل: دلِ ناداں تجھے ہوا کیا ہے (مرزا اسد اللہ خان غالب)"
    ],
    'Pakistan Studies': [
      "The Ideology of Pakistan and Two-Nation Theory",
      "Fourteen Points of Quaid-e-Azam Muhammad Ali Jinnah (1929)",
      "Lahore Resolution (23rd March 1940) and Historical Significance",
      "Major Climatic Regions and Natural Resources of Pakistan",
      "The Constitution of 1973: Salient Features"
    ],
    'Islamiyat / Tarjuma-tul-Quran': [
      "سورۃ الاحزاب: خاتم النبیین صلی اللہ علیہ وآلہ وسلم کی سیرت طیبہ",
      "ارکانِ اسلام: نماز کی پابندی اور معاشرتی فوائد",
      "حقوق العباد: والدین اور اساتذہ کے حقوق",
      "اخلاق و آداب: امانت، سچائی اور دیانت داری",
      "حدیث شریف: طلب علم فریضہ (علم کی اہمیت)"
    ],
    'Computer Science': [
      "Von Neumann Architecture & Components of CPU",
      "Algorithm Design and Flowchart Symbols",
      "Introduction to Python/C: If-Else Conditional Statements",
      "Computer Networks: LAN vs WAN and Topologies",
      "Cyber Safety and Password Protection Principles"
    ],
    'General Science': [
      "The Solar System and Planets Rotation",
      "States of Matter and Changes of State",
      "Human Digestive System and Balanced Diet",
      "Simple Machines: Lever, Pulley, and Inclined Plane",
      "Water Cycle and Conservation of Clean Water"
    ],
  };

  // When prefill arrives from photo scanner
  useEffect(() => {
    if (externalPrefill) {
      if (externalPrefill.topic) setTopic(externalPrefill.topic);
      if (externalPrefill.grade) setSelectedGrade(externalPrefill.grade);
      if (externalPrefill.subject) setSelectedSubject(externalPrefill.subject);
      if (externalPrefill.textbookInfo) setTextbookInfo(externalPrefill.textbookInfo);
      if (externalPrefill.additionalNotes) setAdditionalNotes(externalPrefill.additionalNotes);
      if (externalPrefill.imageBase64) setImageBase64(externalPrefill.imageBase64);
      if (externalPrefill.imageMimeType) setImageMimeType(externalPrefill.imageMimeType);
    }
  }, [externalPrefill]);

  // When loading a saved plan for re-editing from Resource Bank
  useEffect(() => {
    if (initialPlanToEdit) {
      setCurrentPlan(initialPlanToEdit);
      if (initialPlanToEdit.grade && GRADE_CONFIGS[initialPlanToEdit.grade as GradeLevel]) {
        setSelectedGrade(initialPlanToEdit.grade as GradeLevel);
      }
      if (initialPlanToEdit.subject) {
        setSelectedSubject(initialPlanToEdit.subject as SubjectType);
      }
      if (initialPlanToEdit.topic) setTopic(initialPlanToEdit.topic);
      if (initialPlanToEdit.duration) setDuration(initialPlanToEdit.duration);
      if (initialPlanToEdit.language) setLanguage(initialPlanToEdit.language as any);
    }
  }, [initialPlanToEdit]);

  const handleSaveToBank = () => {
    if (!currentPlan) return;
    saveResourceToBank({
      type: 'lesson_plan',
      title: currentPlan.title,
      grade: currentPlan.grade,
      subject: currentPlan.subject,
      topic: currentPlan.topic,
      notes: `Lesson Plan for ${currentPlan.grade} - ${currentPlan.subject}. Duration: ${currentPlan.duration}.`,
      tags: ['Lesson Plan', 'PTB', currentPlan.subject, currentPlan.grade],
      data: currentPlan,
    });
    setSavedToBank(true);
    onSaveToBank?.();
    setTimeout(() => setSavedToBank(false), 2500);
  };

  // Handle grade change and update default duration & available subjects
  const handleGradeChange = (newGrade: GradeLevel) => {
    setSelectedGrade(newGrade);
    const config = GRADE_CONFIGS[newGrade];
    setDuration(config.defaultDuration);

    // If current subject is not valid for this grade, pick first available
    if (!config.subjects.includes(selectedSubject)) {
      setSelectedSubject(config.subjects[0]);
    }
  };

  // Smart subject detection helper: ensures subject matches obvious topics
  const inferSubjectForTopic = (text: string, currentGrade: GradeLevel): SubjectType | null => {
    const t = text.toLowerCase().trim();
    const available = GRADE_CONFIGS[currentGrade].subjects;

    if (t.includes('photosynthesis') || t.includes('heart') || t.includes('cell') || t.includes('respiration') || t.includes('dna') || t.includes('enzyme') || t.includes('breathing') || t.includes('organ') || t.includes('digestive')) {
      if (available.includes('Biology')) return 'Biology';
      if (available.includes('General Science')) return 'General Science';
    }
    if (t.includes('fraction') || t.includes('equation') || t.includes('algebra') || t.includes('geometry') || t.includes('triangle') || t.includes('matrix') || t.includes('matrices') || t.includes('pythagoras') || t.includes('trigonometry') || t.includes('quadratic') || t.includes('lcm') || t.includes('hcf')) {
      if (available.includes('Mathematics')) return 'Mathematics';
    }
    if (t.includes('newton') || t.includes('force') || t.includes('gravity') || t.includes('gravitation') || t.includes('velocity') || t.includes('acceleration') || t.includes('ohm') || t.includes('circuit') || t.includes('pascal')) {
      if (available.includes('Physics')) return 'Physics';
      if (available.includes('General Science')) return 'General Science';
    }
    if (t.includes('atom') || t.includes('molecule') || t.includes('periodic table') || t.includes('reaction') || t.includes('acid') || t.includes('base') || t.includes('bohr') || t.includes('covalent') || t.includes('ionic')) {
      if (available.includes('Chemistry')) return 'Chemistry';
      if (available.includes('General Science')) return 'General Science';
    }
    if (t.includes('water cycle') || t.includes('solar system') || t.includes('planet') || t.includes('living thing')) {
      if (available.includes('General Science')) return 'General Science';
    }
    if (t.includes('noun') || t.includes('verb') || t.includes('tense') || t.includes('speech') || t.includes('grammar') || t.includes('parts of speech') || t.includes('daffodils')) {
      if (available.includes('English')) return 'English';
    }
    if (t.includes('نظم') || t.includes('سبق') || t.includes('غزل') || t.includes('قواعد') || t.includes('اسم')) {
      if (available.includes('Urdu')) return 'Urdu';
    }
    return null;
  };

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (error) setError(null);
    const inferred = inferSubjectForTopic(newTopic, selectedGrade);
    if (inferred && inferred !== selectedSubject) {
      setSelectedSubject(inferred);
    }
  };

  const handleGeneratePlan = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setError('Please enter a specific lesson topic to generate a weekly lesson plan solution.');
      return;
    }

    // Abort prior in-flight generation request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentReqId = ++activeRequestIdRef.current;

    // EXPLICITLY CLEAR PREVIOUS RESULTS: prevents any stale plan from lingering
    setCurrentPlan(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          grade: selectedGrade,
          subject: selectedSubject,
          topic: trimmedTopic, // Strictly pass current topic from user input field
          duration,
          language,
          textbookInfo,
          additionalNotes,
          imageBase64,
          imageMimeType,
          forceFresh: true, // Bypass and purge any prior cached results
        }),
      });

      // If a newer submission was made while this one was in-flight, discard stale response
      if (currentReqId !== activeRequestIdRef.current) {
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate lesson plan.');
      }

      // Strictly lock topic to ensure 100% alignment with user input
      const freshPlan: LessonPlan = {
        ...data.plan,
        topic: trimmedTopic,
        title: data.plan.title && data.plan.title.toLowerCase().includes(trimmedTopic.toLowerCase())
          ? data.plan.title
          : trimmedTopic,
      };

      setCurrentPlan(freshPlan);
      setTopic(trimmedTopic);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cleanly cancelled by a newer one
      }
      if (currentReqId === activeRequestIdRef.current) {
        setError(err.message || 'Failed to generate lesson plan.');
      }
    } finally {
      if (currentReqId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCopyText = () => {
    if (!currentPlan) return;
    const text = formatPlanAsPlainText(currentPlan);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!currentPlan) return;
    setIsWhatsAppModalOpen(true);
  };

  const handlePrint = async () => {
    if (!currentPlan) return;
    const filename = sanitizeFilename(currentPlan.topic || topic || 'Lesson');
    const res = await triggerPrintOrPdf('printable-plan', filename);
    if (res.method === 'download') {
      setPdfSaved(true);
      setTimeout(() => setPdfSaved(false), 2500);
    }
  };

  const handleDownloadDoc = () => {
    if (!currentPlan) return;
    const text = formatPlanAsPlainText(currentPlan);
    const cleanTopic = (currentPlan.topic || 'Lesson').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
    const filename = `Weekly-Lesson-Plan-${cleanTopic}.doc`;
    downloadTextAsFile(text, filename, 'application/msword;charset=utf-8');
  };

  const handleDownloadPdf = async () => {
    if (!currentPlan) return;
    setExportingPdf(true);
    try {
      const filename = sanitizeFilename(currentPlan.topic || topic || 'Lesson');
      await exportElementToPdf('printable-plan', filename);
      setPdfSaved(true);
      setTimeout(() => setPdfSaved(false), 2500);
    } catch (e: any) {
      console.error('Failed to export PDF:', e);
      setError(e?.message || 'Failed to save PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const formatPlanAsPlainText = (p: LessonPlan): string => {
    return `GOVERNMENT OF THE PUNJAB - SCHOOL EDUCATION DEPARTMENT
PUNJAB TEXTBOOK BOARD (PTCB) LESSON PLAN
-----------------------------------------------------------
Class/Grade: ${p.grade}
Subject: ${p.subject}
Topic: ${p.topic}
Duration: ${p.duration}
Language: ${p.language}

PEDAGOGICAL APPROACH:
${p.gradeLevelApproach}

STUDENT LEARNING OUTCOMES (SLOs):
${p.slos.map((s, i) => `${i + 1}. ${s}`).join('\n')}

MATERIALS & TEACHING AIDS:
${p.materialsNeeded.join(', ')}

PHASE 1: INTRODUCTION & HOOK (${p.phases.introduction.duration})
Title: ${p.phases.introduction.title}
Starter / Hook: ${p.phases.introduction.starterQuestionOrRhyme || 'N/A'}
Teacher Actions:
${p.phases.introduction.teacherActions.map((a) => `• ${a}`).join('\n')}
Student Activities:
${p.phases.introduction.studentActivities.map((a) => `• ${a}`).join('\n')}

PHASE 2: DEVELOPMENT & GUIDED PRACTICE (${p.phases.development.duration})
Title: ${p.phases.development.title}
Teacher Actions:
${p.phases.development.teacherActions.map((a) => `• ${a}`).join('\n')}
Student Activities:
${p.phases.development.studentActivities.map((a) => `• ${a}`).join('\n')}
Board Work Summary:
${p.phases.development.boardSummary || 'N/A'}

PHASE 3: CONCLUSION & ASSESSMENT (${p.phases.conclusion.duration})
Title: ${p.phases.conclusion.title}
Teacher Actions:
${p.phases.conclusion.teacherActions.map((a) => `• ${a}`).join('\n')}
Exit Ticket: ${p.phases.conclusion.exitTicket || 'N/A'}

HOMEWORK:
${p.homework}
`;
  };

  const formatPlanForWhatsApp = (p: LessonPlan): string => {
    return `📚 *PUNJAB CURRICULUM LESSON PLAN* 📚
🏫 *Grade:* ${p.grade} | *Subject:* ${p.subject}
🎯 *Topic:* ${p.topic}
⏱️ *Duration:* ${p.duration}

📋 *Key SLOs:*
${p.slos.map((s, i) => `🔹 ${i + 1}. ${s}`).join('\n')}

⏳ *3-Phase Plan:*
1️⃣ *Hook (${p.phases.introduction.duration}):* ${p.phases.introduction.title}
${p.phases.introduction.starterQuestionOrRhyme ? `👉 Q: ${p.phases.introduction.starterQuestionOrRhyme}` : ''}

2️⃣ *Development (${p.phases.development.duration}):* ${p.phases.development.title}
👉 ${p.phases.development.teacherActions[0] || ''}

3️⃣ *Exit Ticket (${p.phases.conclusion.duration}):* ${p.phases.conclusion.exitTicket || ''}

📝 *Homework:* ${p.homework}
_Generated via Taleem Punjab PTB Architect_`;
  };

  const currentGradeConfig = GRADE_CONFIGS[selectedGrade];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Quick Exemplars */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-md no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-700/80 text-emerald-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Punjab Textbook Board Standard
            </span>
            <span className="text-xs text-emerald-300">Prep to Class 10 (Matric)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black mt-1">
            Punjab SLO-Aligned Lesson Architect
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5 max-w-2xl">
            Auto-calculates standard Punjab time distributions, enforces grade-appropriate pedagogy (play-based to BISE Matric numericals), and respects textbook authenticity.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" /> Instant Exemplars (0s wait):
            </span>
            <button
              type="button"
              onClick={() => {
                const ex = EXEMPLAR_LESSON_PLANS[0];
                setCurrentPlan(ex);
                setSelectedGrade(ex.grade as GradeLevel);
                setSelectedSubject(ex.subject as SubjectType);
                setTopic(ex.topic);
                setDuration(ex.duration);
                setLanguage(ex.language as any);
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 text-[11px] font-medium border border-emerald-600/50 transition-colors"
            >
              Physics 9: Newton's 2nd Law
            </button>
            <button
              type="button"
              onClick={() => {
                const ex = EXEMPLAR_LESSON_PLANS[1];
                setCurrentPlan(ex);
                setSelectedGrade(ex.grade as GradeLevel);
                setSelectedSubject(ex.subject as SubjectType);
                setTopic(ex.topic);
                setDuration(ex.duration);
                setLanguage(ex.language as any);
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 text-[11px] font-medium border border-emerald-600/50 transition-colors"
            >
              اردو 9: نظم و ضبط
            </button>
            <button
              type="button"
              onClick={() => {
                const ex = EXEMPLAR_LESSON_PLANS[2];
                setCurrentPlan(ex);
                setSelectedGrade(ex.grade as GradeLevel);
                setSelectedSubject(ex.subject as SubjectType);
                setTopic(ex.topic);
                setDuration(ex.duration);
                setLanguage(ex.language as any);
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 text-[11px] font-medium border border-emerald-600/50 transition-colors"
            >
              Math 5: Unlike Fractions
            </button>
          </div>
        </div>

        {/* Quick Exemplar Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-emerald-200 whitespace-nowrap hidden sm:inline">
            Load Exemplar:
          </span>
          <select
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (!isNaN(idx) && EXEMPLAR_LESSON_PLANS[idx]) {
                const ex = EXEMPLAR_LESSON_PLANS[idx];
                setCurrentPlan(ex);
                setSelectedGrade(ex.grade as GradeLevel);
                setSelectedSubject(ex.subject as SubjectType);
                setTopic(ex.topic);
                setDuration(ex.duration);
                setLanguage(ex.language as any);
              }
            }}
            className="w-full md:w-64 bg-emerald-800 text-white text-xs font-medium px-3 py-2 rounded-xl border border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            defaultValue=""
          >
            <option value="" disabled>
              Select Preloaded Model Plan...
            </option>
            {EXEMPLAR_LESSON_PLANS.map((ex, i) => (
              <option key={i} value={i}>
                {ex.grade} - {ex.subject}: {ex.title.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Config Form on Left, Generated Plan on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (no-print) */}
        <div className="lg:col-span-5 space-y-5 no-print">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                Lesson Specifications
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                PTB Curriculum
              </span>
            </div>

            {/* 1. Class / Grade Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class / Grade Level
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(e.target.value as GradeLevel)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.keys(GRADE_CONFIGS).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Dynamic Pedagogy Indicator */}
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Grade Adaptation: </span>
                  {currentGradeConfig.pedagogyGuidance}
                </div>
              </div>
            </div>

            {/* 2. Subject Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject (Punjab Textbook Board)
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value as SubjectType)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {currentGradeConfig.subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Topic Input & Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lesson Topic / Concept
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenScanner('camera')}
                    className="text-[11px] text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 shadow-2xs transition-colors"
                    title="Open live camera or snap photo of textbook page"
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Camera Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenScanner('upload')}
                    className="text-[11px] text-slate-600 font-semibold hover:text-slate-800 flex items-center gap-1 px-1.5 py-1"
                    title="Upload image file from computer"
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                placeholder="e.g. Photosynthesis, Fractions, The Water Cycle, Newton's 2nd Law..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
              />

              {/* Attached Camera / Scanned Photo Indicator */}
              {imageBase64 && (
                <div className="mt-2.5 p-2 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={`data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}`}
                      alt="Scanned page"
                      className="w-10 h-10 object-cover rounded-lg border border-emerald-300 shadow-2xs flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-950 block text-[11px] truncate flex items-center gap-1">
                        <Camera className="h-3 w-3 text-emerald-700" />
                        Textbook Photo Attached
                      </span>
                      <span className="text-[10px] text-emerald-700 block truncate">
                        SLOs & page details grounded in image
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenScanner('camera')}
                      className="text-[11px] text-emerald-800 font-bold hover:underline px-1.5 py-0.5"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageBase64(undefined);
                        setImageMimeType(undefined);
                      }}
                      className="text-[11px] text-rose-600 font-semibold hover:underline px-1.5 py-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Topic Chips */}
              {topicSuggestions[selectedSubject] && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Common PTB Chapters / Topics:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {topicSuggestions[selectedSubject].slice(0, 3).map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleTopicChange(sug)}
                        className="text-[11px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 px-2 py-1 rounded-lg transition-colors border border-slate-200 text-left line-clamp-1 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Duration & Language */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Duration
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDuration(currentGradeConfig.defaultDuration)}
                  className="text-[10px] text-emerald-600 hover:underline mt-1 block font-semibold"
                >
                  Reset to PTB Default ({currentGradeConfig.defaultDuration.split(' ')[0]})
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Plan Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Urdu">Urdu (اردو)</option>
                  <option value="Bilingual">Bilingual (English + Urdu)</option>
                </select>
              </div>
            </div>

            {/* 5. Textbook Page / Exercise Info (Accuracy Rule) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Textbook Page / Exercise (Optional)
                </label>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                  Accuracy Rule
                </span>
              </div>
              <input
                type="text"
                value={textbookInfo}
                onChange={(e) => setTextbookInfo(e.target.value)}
                placeholder="e.g. Page 42, Ex 3.2 (Only if visible or known)"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave blank if unknown. Taleem Punjab never fabricates textbook page numbers.
              </p>
            </div>

            {/* 6. Teacher Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Special Teacher Focus / Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Focus on step-by-step derivation for slow learners; include safe classroom demo using plastic bottles..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Fast Live Progress Indicator */}
            {loading && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    Turbo PTCB Engine Generating...
                  </span>
                  <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    {elapsedTimer}s
                  </span>
                </div>
                <div className="w-full bg-emerald-200/80 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {elapsedTimer < 1.5
                    ? 'Retrieving Punjab Textbook Board SLOs & grade guidance...'
                    : elapsedTimer < 3.0
                    ? 'Structuring 3-phase pedagogical timing, activities & board summary...'
                    : 'Finalizing ready-to-teach blackboard summary and exit ticket...'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-emerald-200" />
                  <span>Generating Weekly Lesson Plan Solution ({elapsedTimer}s)...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                  <span>Generate Weekly Lesson Plan Solution</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Rules Compliance Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-700" />
              Punjab System Directives Active
            </h4>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-600">
              <li>Mathematics: Worked example + Guided practice + Real-life problem.</li>
              <li>Urdu: Tashreeh, Mushkil Alfaaz & Qiraat in Nastaliq script.</li>
              <li>Science: Safe, non-hazardous household demos & labelled diagram.</li>
              <li>Islamiyat: Verified citations only; religious texts never altered.</li>
              <li>Matric (9-10): Strict BISE exam format with Part a/b numericals.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Dedicated Official Punjab School Sheet Solution */}
        <div className="lg:col-span-7 space-y-5">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 no-print">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-emerald-700 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Completing Official Punjab School Lesson Plan Sheet
                    </h4>
                    <p className="text-xs text-slate-500">
                      Generating full ruled-line solution exclusively for <strong className="text-emerald-800">"{topic.trim() || 'Active Topic'}"</strong>...
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  {elapsedTimer}s
                </span>
              </div>

              {/* Ruled Sheet Active Draft Skeleton */}
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3 animate-pulse">
                <div className="text-center space-y-1 mb-3">
                  <div className="h-4 bg-slate-300 rounded w-1/2 mx-auto"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3 mx-auto"></div>
                </div>

                <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-1">
                    <span>1. Student Learning Outcomes (SLOs)</span>
                    <span className="text-emerald-700 font-bold">Completing 3 Ruled Lines...</span>
                  </div>
                  <div className="h-3 bg-emerald-100/60 rounded w-full"></div>
                  <div className="h-3 bg-emerald-100/60 rounded w-11/12"></div>
                  <div className="h-3 bg-emerald-100/60 rounded w-4/5"></div>
                </div>

                <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-1">
                    <span>2. Previous Knowledge / Hook</span>
                    <span className="text-amber-700 font-bold">Drafting Hook, Link & Deductions...</span>
                  </div>
                  <div className="h-3 bg-amber-100/60 rounded w-full"></div>
                  <div className="h-3 bg-amber-100/60 rounded w-5/6"></div>
                  <div className="h-3 bg-amber-100/60 rounded w-3/4"></div>
                </div>

                <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-1">
                    <span>3. Content & Classroom Activities</span>
                    <span className="text-teal-700 font-bold">Drafting 8 Ruled Lines & Demonstration...</span>
                  </div>
                  <div className="h-3 bg-teal-100/60 rounded w-full"></div>
                  <div className="h-3 bg-teal-100/60 rounded w-11/12"></div>
                  <div className="h-3 bg-teal-100/60 rounded w-10/12"></div>
                  <div className="h-3 bg-teal-100/60 rounded w-9/12"></div>
                </div>

                <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-1">
                    <span>4. Assessment, Homework & Inspection Remarks</span>
                    <span className="text-indigo-700 font-bold">Finalizing Official Format...</span>
                  </div>
                  <div className="h-3 bg-indigo-100/60 rounded w-full"></div>
                  <div className="h-3 bg-indigo-100/60 rounded w-4/5"></div>
                </div>
              </div>
            </div>
          ) : currentPlan ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Action Toolbar (no-print) */}
              <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 no-print">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <FileText className="h-4 w-4 text-emerald-700" />
                    <span>Topic:</span>
                  </span>
                  <span
                    className="text-xs font-extrabold text-emerald-950 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-300 max-w-xs truncate"
                    title={currentPlan.topic}
                  >
                    {currentPlan.topic}
                  </span>
                  
                  <span className="text-xs font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-emerald-700" />
                    Official Punjab School Sheet
                  </span>

                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {currentPlan.grade}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onOpenTimer(
                        currentGradeConfig.tier,
                        `${currentPlan.grade} - ${currentPlan.topic}`
                      )
                    }
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-xs"
                    title="Start Live In-Class Teaching Timer"
                  >
                    <Timer className="h-3.5 w-3.5 text-teal-600" />
                    <span>In-Class Timer</span>
                  </button>

                  <button
                    onClick={handleSaveToBank}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                      savedToBank
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Save this lesson plan to your local Resource Bank for offline reuse"
                  >
                    {savedToBank ? <Check className="h-3.5 w-3.5" /> : <FolderPlus className="h-3.5 w-3.5 text-amber-700" />}
                    <span>{savedToBank ? 'Saved in Bank!' : 'Save to Bank'}</span>
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
                    title="Copy full plan to clipboard"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="Share to WhatsApp (Open directly or copy formatted summary)"
                  >
                    <Share2 className="h-3.5 w-3.5 text-white" />
                    <span>Share to WhatsApp</span>
                  </button>

                  <button
                    onClick={handleDownloadDoc}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
                    title="Export as Word document (.doc)"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Word</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={exportingPdf}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                      pdfSaved
                        ? 'bg-emerald-600 border border-emerald-500 ring-2 ring-emerald-300'
                        : 'bg-emerald-800 hover:bg-emerald-700 border border-emerald-900'
                    }`}
                    title="Download standalone publication-ready PDF file on your device in exact official Punjab School layout"
                  >
                    {exportingPdf ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-300" />
                        <span>Downloading PDF...</span>
                      </>
                    ) : pdfSaved ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-white" />
                        <span>PDF Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Open browser print dialog to print or save to PDF"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-200" />
                    <span>Print Plan</span>
                  </button>
                </div>
              </div>

              {/* Printable Plan Container (Toggles between Punjab School Sheet and Detailed Phases) */}
              {viewLayout === 'punjab-school-sheet' ? (
                <div className="printable-document-wrapper print-friendly-only p-1 sm:p-2 bg-white">
                  <div className="print-friendly-only">
                    <PunjabSchoolLessonPlanSheet
                      plan={currentPlan}
                      onDownloadPdf={handleDownloadPdf}
                      onPrint={handlePrint}
                    />
                  </div>
                </div>
              ) : (
                <div id="printable-plan" data-printable="true" className="printable-document print-friendly-only p-6 sm:p-8 space-y-6">
                  <div className="print-friendly-only space-y-6">
                  {/* Official Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 print-avoid-break">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-900">
                    Government of the Punjab • School Education Department
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    DAILY LESSON PLAN & SLO TEACHING SHEET
                  </h1>
                  <div className="text-xs font-medium text-slate-600 flex items-center justify-center gap-3 pt-1">
                    <span>Punjab Textbook Board (PTCB) Standard</span>
                    <span>•</span>
                    <span>Class: <strong className="text-slate-900">{currentPlan.grade}</strong></span>
                    <span>•</span>
                    <span>Subject: <strong className="text-slate-900">{currentPlan.subject}</strong></span>
                  </div>
                </div>

                {/* Metadata Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Topic</span>
                    <span className="font-bold text-slate-900">{currentPlan.topic}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                    <span className="font-semibold text-slate-800">{currentPlan.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Medium</span>
                    <span className="font-semibold text-slate-800">{currentPlan.language}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pedagogy Tier</span>
                    <span className="font-semibold text-emerald-800">{currentGradeConfig.tier.toUpperCase()}</span>
                  </div>
                </div>

                {/* Curriculum / Safety Notice if present */}
                {currentPlan.curriculumNotice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Curriculum Note: </span>
                      {currentPlan.curriculumNotice}
                    </div>
                  </div>
                )}

                {/* 1. Student Learning Outcomes (SLOs) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <Award className="h-4 w-4 text-emerald-700" />
                    Student Learning Outcomes (SLOs)
                  </h3>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {currentPlan.slos.map((slo, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-slate-800 flex items-start gap-2.5"
                      >
                        <span className="h-5 w-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{slo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Materials & Teaching Aids */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Required Teaching Aids & Requisites
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlan.materialsNeeded.map((mat, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium border border-slate-200"
                      >
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Three-Phase Instructional Plan (Lesson Body) */}
                <div className="lesson-body space-y-4 pt-2" data-section="lesson-body">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <Clock className="h-4 w-4 text-emerald-700" />
                    Instructional Timeline & Classroom Steps
                  </h3>

                  {/* Phase 1: Introduction */}
                  <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/20 print-avoid-break">
                    <div className="bg-amber-100/70 px-4 py-2 flex items-center justify-between text-xs font-bold text-amber-950">
                      <span>Phase 1: {currentPlan.phases.introduction.title}</span>
                      <span className="bg-amber-200/80 px-2 py-0.5 rounded-full text-[11px]">
                        {currentPlan.phases.introduction.duration}
                      </span>
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      {currentPlan.phases.introduction.starterQuestionOrRhyme && (
                        <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-amber-900 font-medium italic">
                          <span className="font-bold not-italic">Hook / Starter: </span>
                          "{currentPlan.phases.introduction.starterQuestionOrRhyme}"
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Teacher Instructions:</span>
                          <ul className="space-y-1 list-disc list-inside text-slate-700">
                            {currentPlan.phases.introduction.teacherActions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Student Actions:</span>
                          <ul className="space-y-1 list-disc list-inside text-slate-700">
                            {currentPlan.phases.introduction.studentActivities.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Development */}
                  <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/20 print-avoid-break">
                    <div className="bg-emerald-100/70 px-4 py-2 flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span>Phase 2: {currentPlan.phases.development.title}</span>
                      <span className="bg-emerald-200/80 px-2 py-0.5 rounded-full text-[11px]">
                        {currentPlan.phases.development.duration}
                      </span>
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Teacher Delivery & Demonstrations:</span>
                          <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                            {currentPlan.phases.development.teacherActions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Student Group & Guided Work:</span>
                          <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                            {currentPlan.phases.development.studentActivities.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {currentPlan.phases.development.boardSummary && (
                        <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 print-avoid-break">
                          <span className="text-emerald-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                            Blackboard / Whiteboard Layout:
                          </span>
                          {currentPlan.phases.development.boardSummary}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase 3: Conclusion */}
                  <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/20 print-avoid-break">
                    <div className="bg-blue-100/70 px-4 py-2 flex items-center justify-between text-xs font-bold text-blue-950">
                      <span>Phase 3: {currentPlan.phases.conclusion.title}</span>
                      <span className="bg-blue-200/80 px-2 py-0.5 rounded-full text-[11px]">
                        {currentPlan.phases.conclusion.duration}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Teacher Wrap-up:</span>
                          <ul className="space-y-1 list-disc list-inside text-slate-700">
                            {currentPlan.phases.conclusion.teacherActions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px] mb-1">Student Assessment Response:</span>
                          <ul className="space-y-1 list-disc list-inside text-slate-700">
                            {currentPlan.phases.conclusion.studentActivities.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {currentPlan.phases.conclusion.exitTicket && (
                        <div className="p-2.5 bg-white rounded-lg border border-blue-200 text-blue-900 font-medium">
                          <span className="font-bold">Exit Ticket / Quick Assessment: </span>
                          {currentPlan.phases.conclusion.exitTicket}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Subject-Specific Pedagogical Section */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Beaker className="h-4 w-4 text-emerald-700" />
                    Subject-Specific Pedagogical Components
                  </h3>

                  {/* Math worked example & real-life problem */}
                  {currentPlan.subjectSpecific.mathData && (
                    <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <span>Mathematics Worked Example & Real-World Application</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-amber-200">
                        <span className="font-bold text-slate-800 block mb-1">Worked Problem:</span>
                        <p className="font-semibold text-slate-900 mb-2">{currentPlan.subjectSpecific.mathData.workedExample.problem}</p>
                        <span className="font-bold text-slate-700 block text-[11px] mb-1">Step-by-step Solution:</span>
                        <ol className="list-decimal list-inside space-y-1 text-slate-700">
                          {currentPlan.subjectSpecific.mathData.workedExample.solutionSteps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                        <div className="mt-2 text-emerald-800 font-bold">
                          Final Answer: {currentPlan.subjectSpecific.mathData.workedExample.finalAnswer}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-amber-200">
                          <span className="font-bold text-slate-800 block mb-1">Guided Practice:</span>
                          <p className="text-slate-700">{currentPlan.subjectSpecific.mathData.guidedPracticeQuestion}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-amber-200">
                          <span className="font-bold text-slate-800 block mb-1">Real-Life Pakistani Scenario:</span>
                          <p className="text-slate-700">{currentPlan.subjectSpecific.mathData.realLifeProblem}</p>
                        </div>
                      </div>

                      {currentPlan.subjectSpecific.mathData.matricDerivationsOrTheorems && (
                        <div className="bg-white p-3 rounded-xl border border-amber-200">
                          <span className="font-bold text-slate-800 block mb-1">Matric Derivation / Theorem Steps:</span>
                          <p className="text-slate-700 whitespace-pre-line">{currentPlan.subjectSpecific.mathData.matricDerivationsOrTheorems}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Urdu Tashreeh & Mushkil Alfaaz */}
                  {currentPlan.subjectSpecific.urduData && (
                    <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-5 space-y-4 text-sm font-urdu" dir="rtl">
                      <div className="font-bold text-emerald-950 text-base border-b border-emerald-200 pb-2">
                        اردو تدریسی اجزاء (تشریح، مشکل الفاظ و معانی، اور قرات)
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 block text-xs font-sans mb-1 text-right">تشریح و مفہوم / مرکزی خیال:</span>
                        <p className="text-slate-800 bg-white p-3 rounded-xl border border-emerald-200 leading-relaxed">
                          {currentPlan.subjectSpecific.urduData.tashreehMafhoom}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 block text-xs font-sans mb-1 text-right">مشکل الفاظ، معانی اور جملے:</span>
                        <div className="overflow-x-auto bg-white rounded-xl border border-emerald-200">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-emerald-100/70 font-sans font-bold text-emerald-950">
                              <tr>
                                <th className="p-2 border-b border-emerald-200">لفظ</th>
                                <th className="p-2 border-b border-emerald-200">معنی</th>
                                <th className="p-2 border-b border-emerald-200">جملہ / استعمال</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentPlan.subjectSpecific.urduData.mushkilAlfaaz.map((alfaz, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                  <td className="p-2 font-bold text-emerald-900">{alfaz.lafz}</td>
                                  <td className="p-2 text-slate-700">{alfaz.maani}</td>
                                  <td className="p-2 text-slate-600">{alfaz.jumla || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-emerald-200">
                        <span className="font-bold text-slate-900 block text-xs font-sans mb-1 text-right">قرات، تلفظ یا تحریری سرگرمی:</span>
                        <p className="text-slate-700 text-xs">{currentPlan.subjectSpecific.urduData.qiraatOrWritingTask}</p>
                      </div>
                    </div>
                  )}

                  {/* Science Demonstration & Diagram Description */}
                  {currentPlan.subjectSpecific.scienceData && (
                    <div className="bg-teal-50/40 border border-teal-200 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-bold text-teal-950 flex items-center justify-between">
                        <span>Safe Classroom Demonstration & Scientific Diagram</span>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                          Safe Materials Only
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-teal-200 space-y-2">
                        <div className="font-bold text-slate-900 text-sm">
                          {currentPlan.subjectSpecific.scienceData.experimentOrDemo.title}
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          <span className="font-bold text-slate-700">Materials: </span>
                          {currentPlan.subjectSpecific.scienceData.experimentOrDemo.safeMaterials.join(', ')}
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block text-[11px] mb-0.5">Procedure Steps:</span>
                          <ol className="list-decimal list-inside space-y-1 text-slate-700">
                            {currentPlan.subjectSpecific.scienceData.experimentOrDemo.procedureSteps.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-900">
                          <span className="font-bold">Scientific Principle: </span>
                          {currentPlan.subjectSpecific.scienceData.experimentOrDemo.scientificPrinciple}
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-900 text-[11px] flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <span><strong>Safety Guideline:</strong> {currentPlan.subjectSpecific.scienceData.experimentOrDemo.safetyWarning}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-teal-200">
                        <span className="font-bold text-slate-800 block mb-1">Blackboard Diagram Blueprint & Labelling:</span>
                        <p className="text-slate-700 leading-relaxed">{currentPlan.subjectSpecific.scienceData.labelledDiagramDescription}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="font-bold text-slate-700 text-xs self-center">Key Scientific Terms:</span>
                        {currentPlan.subjectSpecific.scienceData.keyTerms.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-900 text-[11px] font-semibold rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>

                      {currentPlan.subjectSpecific.scienceData.matricEquationsOrNumericals && (
                        <div className="bg-slate-900 text-teal-200 p-3 rounded-xl font-mono text-[11px]">
                          <span className="text-teal-400 font-bold block mb-1">Matric Laws & Mathematical Relations:</span>
                          {currentPlan.subjectSpecific.scienceData.matricEquationsOrNumericals}
                        </div>
                      )}
                    </div>
                  )}

                  {/* English Skills & Vocabulary */}
                  {currentPlan.subjectSpecific.englishData && (
                    <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-bold text-indigo-950 flex items-center justify-between">
                        <span>English Language Skill Focus & Vocabulary</span>
                        <div className="flex gap-1">
                          {currentPlan.subjectSpecific.englishData.skillFocus.map((sk, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-bold text-[10px] rounded-full">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto bg-white rounded-xl border border-indigo-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-indigo-100/70 font-bold text-indigo-950">
                            <tr>
                              <th className="p-2 border-b border-indigo-200">Target Word</th>
                              <th className="p-2 border-b border-indigo-200">Contextual Meaning</th>
                              <th className="p-2 border-b border-indigo-200">Sample Sentence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentPlan.subjectSpecific.englishData.vocabularyList.map((v, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="p-2 font-bold text-indigo-900">{v.word}</td>
                                <td className="p-2 text-slate-700">{v.meaning}</td>
                                <td className="p-2 text-slate-600 italic">{v.example || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-indigo-200">
                        <span className="font-bold text-slate-800 block mb-1">Student Writing / Sentence-Making Task:</span>
                        <p className="text-slate-700">{currentPlan.subjectSpecific.englishData.writingTask}</p>
                      </div>
                    </div>
                  )}

                  {/* Social Studies / Pak Studies Map & Cause/Effect */}
                  {currentPlan.subjectSpecific.socialStudiesData && (
                    <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-bold text-amber-950">
                        Pakistan Studies / Social Sciences Analytical Elements
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-amber-200">
                        <span className="font-bold text-slate-800 block mb-1">Map, Timeline or Chart Activity:</span>
                        <p className="text-slate-700">{currentPlan.subjectSpecific.socialStudiesData.mapTimelineOrChart}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-amber-200">
                        <span className="font-bold text-slate-800 block mb-1">Cause and Effect Matrix:</span>
                        <div className="space-y-1.5 mt-1">
                          {currentPlan.subjectSpecific.socialStudiesData.causeAndEffect.map((ce, i) => (
                            <div key={i} className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-[11px]">
                              <div><strong className="text-amber-800">Cause:</strong> {ce.cause}</div>
                              <div><strong className="text-emerald-800">Effect:</strong> {ce.effect}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-amber-100/60 p-2.5 rounded-lg text-amber-950">
                        <span className="font-bold">Discussion & Debate Prompt: </span>
                        {currentPlan.subjectSpecific.socialStudiesData.discussionPrompt}
                      </div>
                    </div>
                  )}

                  {/* Islamiyat / Nazra / Quran Verified Citation */}
                  {currentPlan.subjectSpecific.islamiyatData && (
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="font-bold text-emerald-950 text-sm">اسلامیات و ترجمۃ القرآن (مستند حوالہ جاتی طریقہ کار)</span>
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-semibold text-[10px]">
                          {currentPlan.subjectSpecific.islamiyatData.referenceStatus}
                        </span>
                      </div>

                      {currentPlan.subjectSpecific.islamiyatData.ayatOrHadith && (
                        <div className="bg-white p-4 rounded-xl border border-emerald-200 text-center font-amiri text-lg text-emerald-950" dir="rtl">
                          {currentPlan.subjectSpecific.islamiyatData.ayatOrHadith}
                        </div>
                      )}

                      <div className="bg-white p-3 rounded-xl border border-emerald-200 text-right font-urdu" dir="rtl">
                        <span className="font-bold text-emerald-900 block text-xs font-sans mb-1">ترجمہ و مفہوم:</span>
                        <p className="text-slate-800">{currentPlan.subjectSpecific.islamiyatData.translationMafhoom}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded-xl border border-emerald-200">
                          <span className="font-bold text-slate-800 block mb-1">اخلاقی و عملی سبق (روزمرہ زندگی میں اطلاق):</span>
                          <p className="text-slate-700">{currentPlan.subjectSpecific.islamiyatData.moralAndPracticalLesson}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-emerald-200">
                          <span className="font-bold text-slate-800 block mb-1">آدابِ تلاوت و تلفظ کی رہنمائی:</span>
                          <p className="text-slate-700">{currentPlan.subjectSpecific.islamiyatData.respectfulQiraatGuidance}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Computer Science (Lab + Zero-Lab Paper Alternative) */}
                  {currentPlan.subjectSpecific.computerData && (
                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>Computer Science Practical Tasks</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          Includes Zero-Lab Alternative
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="font-bold text-emerald-800 block mb-1">Hands-on Computer Lab Task:</span>
                          <p className="text-slate-700">{currentPlan.subjectSpecific.computerData.labTask}</p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                          <span className="font-bold text-amber-900 block mb-1">Zero-Lab (Paper / Board) Alternative:</span>
                          <p className="text-amber-950">{currentPlan.subjectSpecific.computerData.zeroLabAlternative}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="font-bold text-slate-700 text-xs self-center">Key Tech Terms:</span>
                        {currentPlan.subjectSpecific.computerData.keyTerms.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-800 font-mono text-[11px] rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. BISE Matric Corner (For Class 9 and 10) */}
                {currentPlan.biseMatricCorner && currentPlan.biseMatricCorner.applicable && (
                  <div className="border border-purple-200 bg-purple-50/30 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-700" />
                        <h4 className="font-bold text-purple-950 text-sm">
                          BISE Punjab Board Exam Corner (Matric Exam Alignment)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                        Past Papers Trend
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-purple-100">
                        <span className="font-bold text-slate-800 block text-[11px] mb-1">
                          Frequently Examined Concepts:
                        </span>
                        <ul className="space-y-1 list-disc list-inside text-slate-700">
                          {currentPlan.biseMatricCorner.frequentPastPaperConcepts?.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                        <span className="font-bold text-rose-900 block text-[11px] mb-1">
                          Common Student Board Exam Mistakes:
                        </span>
                        <ul className="space-y-1 list-disc list-inside text-rose-800">
                          {currentPlan.biseMatricCorner.commonStudentPitfalls?.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Sample Board Questions */}
                    {currentPlan.biseMatricCorner.sampleBoardQuestions && (
                      <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2 mt-2">
                        <span className="font-bold text-purple-950 block text-[11px] uppercase tracking-wider">
                          Sample BISE Punjab Questions from this Topic:
                        </span>

                        {currentPlan.biseMatricCorner.sampleBoardQuestions.objectiveMcqs && (
                          <div className="space-y-1.5 pt-1">
                            <span className="font-bold text-slate-700 block text-[11px]">Objective (MCQs):</span>
                            {currentPlan.biseMatricCorner.sampleBoardQuestions.objectiveMcqs.map((mcq, i) => (
                              <div key={i} className="p-2 bg-slate-50 rounded-lg text-[11px]">
                                <div className="font-medium text-slate-900">{mcq.question}</div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1 text-slate-600">
                                  {mcq.options.map((opt, oi) => (
                                    <span key={oi} className={opt.startsWith(mcq.correct) ? 'font-bold text-emerald-700' : ''}>
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPlan.biseMatricCorner.sampleBoardQuestions.shortQuestions && (
                          <div className="space-y-1 pt-1">
                            <span className="font-bold text-slate-700 block text-[11px]">Subjective Part I (Short Questions - 2 Marks each):</span>
                            <ul className="list-disc list-inside text-slate-700">
                              {currentPlan.biseMatricCorner.sampleBoardQuestions.shortQuestions.map((sq, i) => (
                                <li key={i}>{sq}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentPlan.biseMatricCorner.sampleBoardQuestions.longQuestion && (
                          <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-950 mt-1">
                            <span className="font-bold block text-[11px]">Subjective Part II (Long Question - Model Part a & b):</span>
                            <p className="whitespace-pre-line text-slate-800">{currentPlan.biseMatricCorner.sampleBoardQuestions.longQuestion}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Differentiated Learning & Homework */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">Differentiated Teaching Strategy:</span>
                    <p className="text-slate-600 mb-1">
                      <strong className="text-slate-700">For Struggling Students: </strong>
                      {currentPlan.differentiatedLearning?.forStrugglingStudents || 'Use visual models and peer pairing.'}
                    </p>
                    <p className="text-slate-600">
                      <strong className="text-slate-700">For Advanced Students: </strong>
                      {currentPlan.differentiatedLearning?.forAdvancedStudents || 'Assign extension numerical / challenge problem.'}
                    </p>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-950 block mb-1">Homework & Notebook Task:</span>
                    <p className="text-slate-800 leading-relaxed">{currentPlan.homework}</p>
                  </div>
                </div>

                  {/* Teacher Signature & Inspection Sign-off */}
                  <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[11px] text-slate-500">
                    <div className="border-t border-slate-400 pt-1">Subject Teacher Signature</div>
                    <div className="border-t border-slate-400 pt-1">Section Head / Coordinator</div>
                    <div className="border-t border-slate-400 pt-1">Principal / Inspection Officer</div>
                  </div>
                  </div>
                </div>
              )}
          </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center">
              <BookOpen className="h-10 w-10 text-emerald-600 mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">Official Punjab School Sheet Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Enter your lesson topic on the left and click "Generate Weekly Lesson Plan Solution" to complete the solution directly on the official Punjab School Sheet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        plan={currentPlan}
      />
    </div>
  );
};
