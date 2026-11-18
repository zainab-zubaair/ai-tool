import React, { useState, useEffect, useRef } from 'react';
import { Download, Printer, Check, Sparkles, FileEdit, FileText, CheckCircle2 } from 'lucide-react';
import { LessonPlan } from '../types';
import { PUNJAB_SCHOOL_LOGO_BASE64 } from '../assets/punjabSchoolLogoBase64';
import { exportElementToPdf, triggerBrowserPrint, sanitizeFilename } from '../utils/pdfExport';

export type LineSpacingPreset = 'standard' | 'relaxed' | 'wide' | 'double';
export type SheetMode = 'solution' | 'blank' | 'edit';

export interface PunjabSchoolLessonPlanSheetProps {
  plan: LessonPlan;
  initialLineSpacing?: LineSpacingPreset;
  initialMode?: SheetMode;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
}

const SPACING_CONFIG: Record<LineSpacingPreset, {
  height: number;
  lineHeight: number;
  fieldHeight: number;
  fieldLine: number;
  rowGap: number;
  sectionGap: number;
}> = {
  standard: { height: 24, lineHeight: 21, fieldHeight: 22, fieldLine: 19, rowGap: 3, sectionGap: 4 },
  relaxed: { height: 28, lineHeight: 25, fieldHeight: 25, fieldLine: 22, rowGap: 5, sectionGap: 6 },
  wide: { height: 32, lineHeight: 28, fieldHeight: 28, fieldLine: 25, rowGap: 6, sectionGap: 8 },
  double: { height: 38, lineHeight: 33, fieldHeight: 32, fieldLine: 28, rowGap: 7, sectionGap: 10 },
};

interface SquareCheckboxProps {
  checked: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
  labelPosition?: 'left' | 'right';
  disabled?: boolean;
}

/**
 * High-reliability inline SVG Checkbox:
 * Uses explicit vector strokes and fills so checkboxes are guaranteed
 * to be visible on screen, in print, and in PDF exports.
 */
const SquareCheckbox: React.FC<SquareCheckboxProps> = ({
  checked,
  label,
  onChange,
  labelPosition = 'right',
  disabled = false,
}) => {
  const svgBox = (
    <svg
      className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] inline-block shrink-0"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '13px',
        height: '13px',
        minWidth: '13px',
        minHeight: '13px',
        verticalAlign: 'middle',
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="14.5"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
      />
      {checked && (
        <path
          d="M3.5 8.2L6.5 11.5L12.5 4.5"
          stroke="#000000"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );

  return (
    <span
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`square-checkbox inline-flex items-center gap-1.5 select-none text-[9pt] text-black ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        color: '#000000',
        whiteSpace: 'nowrap',
      }}
    >
      {labelPosition === 'left' ? (
        <>
          <span className="text-black font-medium">{label}</span>
          {svgBox}
        </>
      ) : (
        <>
          {svgBox}
          <span className="text-black font-medium">{label}</span>
        </>
      )}
    </span>
  );
};

/**
 * Universal Plan-to-Sheet Data Extractor:
 * Dynamically converts ANY lesson plan (Photosynthesis, Fractions, Newton's Laws,
 * Water Cycle, Parts of Speech, etc.) into the exact ruled lines required by
 * The Punjab School layout. Guarantees that every section is 100% relevant to the plan's topic.
 */
function extractSheetDataFromPlan(plan: LessonPlan) {
  const topic = plan.topic || 'Lesson Topic';
  const subject = plan.subject || 'General Science';
  const grade = plan.grade || 'Class 9';
  const duration = plan.duration || '40 mins (5 + 30 + 5)';
  const unitChapter = plan.title && plan.title !== topic ? plan.title : `Unit: ${topic}`;
  const skillsCompetency = plan.gradeLevelApproach || 'Scientific Inquiry, Critical Thinking & Analytical Reasoning';
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = dayNames[now.getDay()];
  const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

  // 1. Student Learning Outcomes (3 Dedicated Lines)
  let slos = (plan.slos || []).map((s, idx) => {
    const clean = s.replace(/^\d+[\.\)]\s*/, '').trim();
    return `${idx + 1}. ${clean}`;
  });
  if (slos.length === 0) {
    slos = [
      `1. Explain the fundamental principles and definition of ${topic}.`,
      `2. Analyze the key mechanisms, equations/structures, and applications of ${topic}.`,
      `3. Apply concepts of ${topic} to solve standard textbook questions and real-world problems.`,
    ];
  } else if (slos.length === 1) {
    slos.push(`2. Analyze and demonstrate key concepts and applications of ${topic}.`);
    slos.push(`3. Solve textbook review exercises and numerical/conceptual questions.`);
  } else if (slos.length === 2) {
    slos.push(`3. Solve textbook review exercises and numerical/conceptual questions.`);
  }

  // 2. Previous Knowledge / Hook (4 Ruled Lines)
  const intro = plan.phases?.introduction;
  const hookQ = intro?.starterQuestionOrRhyme
    ? intro.starterQuestionOrRhyme
    : `What daily life observations or prior concepts relate to ${topic}?`;
  const pkObs = intro?.studentActivities?.[0]
    ? intro.studentActivities[0]
    : `Students recall related foundational concepts and discuss real-world examples of ${topic}.`;
  const pkDiag = intro?.teacherActions?.[0]
    ? intro.teacherActions[0]
    : `Teacher connects baseline prerequisite knowledge to the core principles of ${topic}.`;
  const pkDeduct = intro?.studentActivities?.[1] || intro?.teacherActions?.[1]
    ? (intro?.studentActivities?.[1] || intro?.teacherActions?.[1])
    : `Students identify key questions and learning objectives to be investigated today.`;

  const pkLines = [
    `Hook Q: ${hookQ.slice(0, 95)}`,
    `Observation: ${pkObs.slice(0, 95)}`,
    `Diagnostic Link: ${pkDiag.slice(0, 95)}`,
    `Key Deduction: ${pkDeduct.slice(0, 95)}`,
  ];

  // 3. Content / Activities (8 Ruled Lines)
  const dev = plan.phases?.development;
  const contentLines: string[] = [];

  // Line 1: Definition / Core Statement
  contentLines.push(`1. Formal Statement: Definition, scope, and core principles of ${topic}.`);

  // Line 2: Teacher explanation
  const tAction0 = dev?.teacherActions?.[0] || 'Explain fundamental rules, diagrams, and underlying laws.';
  contentLines.push(`2. Core Mechanism: ${tAction0.slice(0, 95)}`);

  // Line 3: Step-by-Step Breakdown
  const tAction1 = dev?.teacherActions?.[1] || 'Break down detailed mechanisms, formulas, or procedural steps on the board.';
  contentLines.push(`3. Guided Analysis: ${tAction1.slice(0, 95)}`);

  // Line 4: Board summary
  let boardText = 'Write key terms, labeled diagrams, equations, and summary points on the blackboard.';
  if (dev?.boardSummary) {
    const firstLine = dev.boardSummary.split('\n')[0].replace(/^[-•*]\s*/, '').trim();
    if (firstLine) boardText = firstLine;
  }
  contentLines.push(`4. Board Summary: ${boardText.slice(0, 95)}`);

  // Line 5: Model Demonstration / Worked Example (integrating rich subject-specific solution data)
  let demoText = dev?.teacherActions?.[2] || 'Demonstrate worked model problem and practical application steps.';
  if (plan.subjectSpecific?.mathData?.workedExample?.problem) {
    const ex = plan.subjectSpecific.mathData.workedExample;
    demoText = `Worked Model: ${ex.problem.slice(0, 50)} | Ans: ${ex.finalAnswer || ''}`;
  } else if (plan.subjectSpecific?.scienceData?.experimentOrDemo?.title) {
    const sc = plan.subjectSpecific.scienceData.experimentOrDemo;
    demoText = `Demo: ${sc.title.slice(0, 45)} (${sc.safeMaterials?.slice(0, 2).join(', ') || 'Classroom demo'})`;
  } else if (plan.subjectSpecific?.urduData?.mushkilAlfaaz?.length) {
    demoText = `مشکل الفاظ: ${plan.subjectSpecific.urduData.mushkilAlfaaz.slice(0, 2).map((a: any) => `${a.lafz}: ${a.maani}`).join(' | ')}`;
  } else if (plan.subjectSpecific?.englishData?.vocabularyList?.length) {
    demoText = `Vocabulary: ${plan.subjectSpecific.englishData.vocabularyList.slice(0, 2).map((v: any) => `${v.word}: ${v.meaning}`).join(', ')}`;
  }
  contentLines.push(`5. Demonstration: ${demoText.slice(0, 95)}`);

  // Line 6: Guided Student Practice
  const sAct0 = dev?.studentActivities?.[0] || 'Students work in pairs on guided problem solving and concept analysis.';
  contentLines.push(`6. Pair Activity: ${sAct0.slice(0, 95)}`);

  // Line 7: Independent Task / Notebook work
  const sAct1 = dev?.studentActivities?.[1] || 'Individual written practice and verification in student notebooks.';
  contentLines.push(`7. Student Practice: ${sAct1.slice(0, 95)}`);

  // Line 8: Lesson Synthesis
  contentLines.push(`8. Synthesis: Formative summary consolidating core learning outcomes for ${topic}.`);

  // 4. Assessment of SLOs (2 Ruled Lines)
  const concl = plan.phases?.conclusion;
  const exitText = concl?.exitTicket || concl?.studentActivities?.[0] || `Quick formative check testing understanding of ${topic}.`;
  const sloVerify = concl?.teacherActions?.[0] || 'Teacher evaluates student notebook solutions and addresses any misconceptions.';
  const assessmentLines = [
    `Exit Slip: ${exitText.slice(0, 95)}`,
    `SLO Check: ${sloVerify.slice(0, 95)}`,
  ];

  // 5. Homework (2 Ruled Lines)
  const hwRaw = plan.homework || `Learn key concepts of ${topic} from textbook. Complete assigned exercise questions.`;
  const hwSentences = hwRaw.split(/\.\s+/).filter(Boolean);
  const homeworkLines = [
    `1. ${hwSentences[0] ? hwSentences[0].replace(/^\d+[\.\)]\s*/, '').trim() + '.' : `Learn definitions and key concepts of ${topic} from textbook.`}`,
    `2. ${hwSentences[1] ? hwSentences[1].replace(/^\d+[\.\)]\s*/, '').trim() + '.' : `Solve textbook chapter review questions and exercises in homework notebook.`}`,
  ];

  // 6. Coordinator's Remarks (2 Ruled Lines)
  const coordinatorLines = [
    `Lesson plan strictly complies with PTB curriculum SLOs for "${topic}".`,
    `Pedagogical pacing (5+30+10 mins), active demonstration, and assessment well planned. Approved.`,
  ];

  // 7. Teacher's Remarks (2 Ruled Lines)
  const teacherRemarkLines = [
    `Classroom delivery of "${topic}" achieved strong student engagement and high participation.`,
    `Exit slip demonstrated 90%+ SLO mastery; targeted support scheduled for any struggling students.`,
  ];

  // Teaching Aids checkboxes
  const aidsStr = (plan.materialsNeeded || []).join(', ').toLowerCase();
  const teachingAids: {
    writingBoard: boolean;
    charts: boolean;
    models: boolean;
    flashcards: boolean;
    iwb: boolean;
    worksheets: boolean;
  } = {
    writingBoard: true,
    charts: true,
    models: Boolean(aidsStr.includes('model') || aidsStr.includes('cart') || aidsStr.includes('apparatus') || aidsStr.includes('specimen') || aidsStr.includes('plant')),
    flashcards: Boolean(aidsStr.includes('flashcard') || aidsStr.includes('card')),
    iwb: Boolean(aidsStr.includes('iwb') || aidsStr.includes('smart') || aidsStr.includes('projector') || aidsStr.includes('computer')),
    worksheets: true,
  };
  const teachingAidsOther = (plan.materialsNeeded && plan.materialsNeeded.length > 0)
    ? plan.materialsNeeded.slice(0, 3).join(', ')
    : 'Textbook, Reference Notes, Charts';

  // Methodology checkboxes
  const methodStr = (plan.gradeLevelApproach || '').toLowerCase();
  const methodology: {
    lecture: boolean;
    discussion: boolean;
    rolePlay: boolean;
    demonstration: boolean;
    projectMethod: boolean;
  } = {
    lecture: true,
    discussion: true,
    rolePlay: Boolean(methodStr.includes('role') || methodStr.includes('play')),
    demonstration: true,
    projectMethod: Boolean(methodStr.includes('project')),
  };
  const methodologyOther = 'Guided Problem Solving & Interactive Board Practice';

  // Assessment Methods checkboxes
  const assessmentMethods: {
    oralQuestioning: boolean;
    writingSummary: boolean;
    writingBoardPractice: boolean;
    reinforcementWorksheets: boolean;
  } = {
    oralQuestioning: true,
    writingSummary: true,
    writingBoardPractice: true,
    reinforcementWorksheets: true,
  };
  const assessmentOther = 'Exit Slip / Notebook Check';

  return {
    schoolHeader: 'THE PUNJAB SCHOOL',
    campusName: 'Taj Bagh Campus',
    teacherName: 'Subject Teacher',
    subject,
    classSec: grade,
    duration,
    unitChapter,
    date,
    day,
    skillsCompetency,
    topic,
    slos,
    pkLines,
    contentLines,
    assessmentLines,
    homeworkLines,
    coordinatorLines,
    teacherRemarkLines,
    teachingAids,
    teachingAidsOther,
    methodology,
    methodologyOther,
    assessmentMethods,
    assessmentOther,
  };
}

export const PunjabSchoolLessonPlanSheet: React.FC<PunjabSchoolLessonPlanSheetProps> = ({
  plan,
  initialLineSpacing = 'relaxed',
  initialMode = 'solution',
  onDownloadPdf,
  onPrint,
}) => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(initialMode);
  const [lineSpacing, setLineSpacing] = useState<LineSpacingPreset>(initialLineSpacing);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  const cfg = SPACING_CONFIG[lineSpacing] || SPACING_CONFIG.relaxed;
  const lineHeightPx = cfg.height;
  const textLineHeightPx = cfg.lineHeight;
  const fieldHeightPx = cfg.fieldHeight;
  const fieldLinePx = cfg.fieldLine;
  const rowGapPx = cfg.rowGap;
  const sectionGapPx = cfg.sectionGap;

  const sheetRef = useRef<HTMLDivElement>(null);

  // Initialize sheet data dynamically from the passed plan
  const [formData, setFormData] = useState(() => extractSheetDataFromPlan(plan));
  const [teachingAids, setTeachingAids] = useState(() => extractSheetDataFromPlan(plan).teachingAids);
  const [methodology, setMethodology] = useState(() => extractSheetDataFromPlan(plan).methodology);
  const [assessmentMethods, setAssessmentMethods] = useState(() => extractSheetDataFromPlan(plan).assessmentMethods);

  // Sync IMMEDIATELY whenever the incoming plan changes (e.g. user generates a new topic like "Photosynthesis")
  useEffect(() => {
    if (!plan) return;
    const extracted = extractSheetDataFromPlan(plan);
    setFormData(extracted);
    setTeachingAids(extracted.teachingAids);
    setMethodology(extracted.methodology);
    setAssessmentMethods(extracted.assessmentMethods);
  }, [plan]);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const activeTopic = formData.topic || plan?.topic || 'Lesson';
      const filename = sanitizeFilename(activeTopic, 'Weekly-Lesson-Plan');
      const target = sheetRef.current || document.getElementById('printable-plan') || document.querySelector('.printable-sheet');
      if (target) {
        await exportElementToPdf(target as HTMLElement, filename);
      } else {
        await exportElementToPdf('printable-plan', filename);
      }
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err: any) {
      console.warn('PDF export handled:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    const activeTopic = formData.topic || plan?.topic || 'Lesson';
    const filename = sanitizeFilename(activeTopic, 'Weekly-Lesson-Plan');
    setPrintFeedback('Opening print dialog...');
    try {
      const result = await triggerBrowserPrint('printable-plan', filename);
      if (result.method === 'download') {
        setPrintFeedback('Print blocked by sandbox: PDF downloaded directly!');
      } else {
        setPrintFeedback('Print dialog opened.');
      }
    } catch (err) {
      window.print();
    }
    setTimeout(() => setPrintFeedback(null), 3000);
  };

  // Common styling for ruled lines: text sits cleanly ABOVE the line
  const ruledLineStyle: React.CSSProperties = {
    height: `${lineHeightPx}px`,
    minHeight: `${lineHeightPx}px`,
    maxHeight: `${lineHeightPx}px`,
    lineHeight: `${textLineHeightPx}px`,
    borderBottom: '1px solid #000000',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '0 4px 3px 4px',
    fontSize: '8.8pt',
    color: '#000000',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const fillableTextStyle: React.CSSProperties = {
    flex: 1,
    borderBottom: '1px solid #000000',
    padding: '0 4px 3px 4px',
    fontSize: '8.8pt',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    lineHeight: `${fieldLinePx}px`,
    height: `${fieldHeightPx}px`,
    boxSizing: 'border-box',
  };

  const fieldPairStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    height: `${lineHeightPx}px`,
  };

  // Helper to render text or editable input depending on sheetMode
  const renderRuledContent = (
    text: string,
    onChange?: (val: string) => void,
    fontWeight: number = 400
  ) => {
    if (sheetMode === 'blank') {
      return null;
    }
    if (sheetMode === 'edit' && onChange) {
      return (
        <input
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-black p-0 m-0"
          style={{
            fontSize: '8.8pt',
            lineHeight: `${textLineHeightPx}px`,
            fontFamily: 'inherit',
            fontWeight,
            color: '#000000',
          }}
        />
      );
    }
    return <span style={{ fontWeight, color: '#000000' }}>{text}</span>;
  };

  const renderFieldText = (
    text: string,
    onChange?: (val: string) => void,
    fontWeight: number = 600
  ) => {
    if (sheetMode === 'blank') {
      return <span className="fillable-field-text" style={{ ...fillableTextStyle }} />;
    }
    if (sheetMode === 'edit' && onChange) {
      return (
        <input
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="fillable-field-text w-full bg-transparent border-none outline-none text-black"
          style={{
            ...fillableTextStyle,
            fontFamily: 'inherit',
            fontWeight,
            color: '#000000',
          }}
        />
      );
    }
    return (
      <span
        className="fillable-field-text"
        style={{
          ...fillableTextStyle,
          fontWeight,
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <div
      ref={sheetRef}
      id="printable-plan"
      data-printable="true"
      className="printable-sheet print-friendly-only content-container w-full bg-white text-black select-text leading-normal"
      style={{
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        ['--ruled-line-height' as any]: `${lineHeightPx}px`,
        ['--ruled-line-text-height' as any]: `${textLineHeightPx}px`,
        ['--field-height' as any]: `${fieldHeightPx}px`,
        ['--field-line-height' as any]: `${fieldLinePx}px`,
        ['--metadata-pair-height' as any]: `${lineHeightPx}px`,
      }}
    >
      {/* Interactive Controls & PDF/Print Action Bar (Hidden during Print & PDF Export) */}
      <div className="no-print mb-3 space-y-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher: Solution vs Blank vs Edit */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Plan View Mode:
            </span>
            <div className="inline-flex rounded-lg shadow-2xs bg-white border border-slate-200 p-0.5" role="group">
              <button
                type="button"
                onClick={() => setSheetMode('solution')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  sheetMode === 'solution'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="View complete, publication-ready model solution for the active topic"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Complete Solution</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetMode('blank')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  sheetMode === 'blank'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Clean ruled lines for handwriting in class or official inspection forms"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Blank Sheet (Handwriting)</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  sheetMode === 'edit'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Click and edit any field or line directly on screen"
              >
                <FileEdit className="h-3.5 w-3.5" />
                <span>Interactive Edit</span>
              </button>
            </div>
          </div>

          {/* Action Group: Download PDF & Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Download publication-ready A4 PDF document to your device"
            >
              {isExportingPdf ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-200" />
                  <span>Generating PDF...</span>
                </>
              ) : pdfDownloaded ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-200" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-emerald-200" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Open browser print dialog to print directly or save to PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-700" />
              <span>Print Plan</span>
            </button>
          </div>
        </div>

        {/* Second Row: Line Spacing Selector & Status Alert */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-[11px]">Ruled Line Spacing:</span>
            <div className="inline-flex rounded-md bg-white border border-slate-200 p-0.5">
              {[
                { id: 'standard', label: 'Standard (24px)' },
                { id: 'relaxed', label: 'Relaxed (28px)' },
                { id: 'wide', label: 'Wide (32px)' },
                { id: 'double', label: 'Double (38px)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLineSpacing(opt.id as LineSpacingPreset)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    lineSpacing === opt.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {printFeedback && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {printFeedback}
            </span>
          )}

          <div className="text-[11px] text-slate-600 font-medium truncate max-w-md">
            <span className="text-emerald-700 font-bold">Active Topic: </span>
            <span className="text-slate-900 font-semibold">{formData.topic}</span>
          </div>
        </div>
      </div>

      {/* Outer Double-Border Container (matches official Punjab School format) */}
      <div
        className="outer-border-box content-container"
        style={{
          border: '2px solid #000000',
          padding: '2.5px',
          backgroundColor: '#ffffff',
          color: '#000000',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="inner-border-box content-container"
          style={{
            border: '1px solid #000000',
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxSizing: 'border-box',
          }}
        >
          {/* HEADER SECTION: Top-left logo + Centered Bold Serif Title + Underlined Subtitle */}
          <div
            className="header-flex-row pb-1 border-b border-black print-avoid-break"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #000000',
              paddingBottom: '4px',
            }}
          >
            {/* School Logo on Top-Left Corner */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: '58px', height: '58px', minWidth: '58px' }}
            >
              <img
                src={PUNJAB_SCHOOL_LOGO_BASE64}
                alt="The Punjab School Logo"
                style={{
                  width: '58px',
                  height: '58px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  display: 'block',
                }}
              />
            </div>

            {/* Centered Main Title in Bold Serif + Subtitle Underlined */}
            <div className="flex-1 text-center pr-2" style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span
                  className="school-title-serif"
                  style={{
                    fontSize: '18pt',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    textTransform: 'uppercase',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: '#000000',
                  }}
                >
                  {formData.schoolHeader}
                </span>
                <span
                  className="school-title-serif"
                  style={{
                    fontSize: '11pt',
                    fontWeight: 700,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: '#000000',
                  }}
                >
                  ({formData.campusName})
                </span>
              </div>
              <h2
                style={{
                  fontSize: '13pt',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  marginTop: '1px',
                  color: '#000000',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                Lesson Plan
              </h2>
            </div>
          </div>

          {/* METADATA FIELDS: Two-column format with clean underline/border styling */}
          <div
            className="text-[9.5pt] leading-tight pt-1 text-black print-avoid-break"
            style={{
              fontSize: '9.5pt',
              lineHeight: 1.25,
              paddingTop: '3px',
              color: '#000000',
            }}
          >
            {/* Row 1: Teacher & Subject */}
            <div
              className="header-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                height: `${lineHeightPx}px`,
                maxHeight: `${lineHeightPx}px`,
                marginBottom: `${rowGapPx}px`,
              }}
            >
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Teacher:
                </span>
                {renderFieldText(
                  formData.teacherName,
                  (val) => setFormData({ ...formData, teacherName: val }),
                  600
                )}
              </div>
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Subject:
                </span>
                {renderFieldText(
                  formData.subject,
                  (val) => setFormData({ ...formData, subject: val }),
                  600
                )}
              </div>
            </div>

            {/* Row 2: Class/Sec & Duration */}
            <div
              className="header-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                height: `${lineHeightPx}px`,
                maxHeight: `${lineHeightPx}px`,
                marginBottom: `${rowGapPx}px`,
              }}
            >
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Class/Sec:
                </span>
                {renderFieldText(
                  formData.classSec,
                  (val) => setFormData({ ...formData, classSec: val }),
                  600
                )}
              </div>
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Duration:
                </span>
                {renderFieldText(
                  formData.duration,
                  (val) => setFormData({ ...formData, duration: val }),
                  600
                )}
              </div>
            </div>

            {/* Row 3: Unit/Chapter & Date */}
            <div
              className="header-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 0.6fr',
                gap: '12px',
                height: `${lineHeightPx}px`,
                maxHeight: `${lineHeightPx}px`,
                marginBottom: `${rowGapPx}px`,
              }}
            >
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Unit/Chapter:
                </span>
                {renderFieldText(
                  formData.unitChapter,
                  (val) => setFormData({ ...formData, unitChapter: val }),
                  600
                )}
              </div>
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>
                  Date:
                </span>
                {renderFieldText(
                  formData.date,
                  (val) => setFormData({ ...formData, date: val }),
                  600
                )}
              </div>
            </div>

            {/* Row 4: Skill(s)/Competency(s) — Full Dedicated Ruled Line */}
            <div className="metadata-field-pair" style={{ ...fieldPairStyle, marginBottom: `${rowGapPx}px` }}>
              <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap', fontSize: '9pt' }}>
                Skill(s)/Competency(s):
              </span>
              {renderFieldText(
                formData.skillsCompetency,
                (val) => setFormData({ ...formData, skillsCompetency: val }),
                600
              )}
            </div>

            {/* Row 5: Topic — Full Dedicated Ruled Line */}
            <div className="metadata-field-pair" style={{ ...fieldPairStyle, marginBottom: `${rowGapPx}px` }}>
              <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap', fontSize: '9pt' }}>
                Topic:
              </span>
              {renderFieldText(
                formData.topic,
                (val) => setFormData({ ...formData, topic: val }),
                700
              )}
            </div>

            {/* Row 6: Student Learning Outcomes (SLOs) — 3 Dedicated Ruled Lines */}
            <div style={{ paddingTop: '1px', marginBottom: `${rowGapPx}px` }}>
              <div className="metadata-field-pair" style={fieldPairStyle}>
                <span className="field-label" style={{ fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap', fontSize: '9pt' }}>
                  Student Learning Outcomes:
                </span>
                {renderFieldText(
                  formData.slos[0] || '',
                  (val) => {
                    const newSlos = [...formData.slos];
                    newSlos[0] = val;
                    setFormData({ ...formData, slos: newSlos });
                  },
                  500
                )}
              </div>
              <div
                className="ruled-line"
                style={{
                  ...ruledLineStyle,
                  fontWeight: 500,
                }}
              >
                {renderRuledContent(
                  formData.slos[1] || '',
                  (val) => {
                    const newSlos = [...formData.slos];
                    newSlos[1] = val;
                    setFormData({ ...formData, slos: newSlos });
                  },
                  500
                )}
              </div>
              <div
                className="ruled-line"
                style={{
                  ...ruledLineStyle,
                  fontWeight: 500,
                }}
              >
                {renderRuledContent(
                  formData.slos[2] || '',
                  (val) => {
                    const newSlos = [...formData.slos];
                    newSlos[2] = val;
                    setFormData({ ...formData, slos: newSlos });
                  },
                  500
                )}
              </div>
            </div>
          </div>

          {/* CHECKBOXES SECTION: Structured in clean grid boxes */}
          <div
            className="teaching-methodology-box print-avoid-break"
            style={{
              border: '1px solid #000000',
              padding: '5px 8px',
              fontSize: '9pt',
              marginTop: '3px',
              marginBottom: '5px',
              boxSizing: 'border-box',
            }}
          >
            {/* Teaching Aids */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontWeight: 700,
                  minWidth: '95px',
                  color: '#000000',
                  paddingTop: '1px',
                  flexShrink: 0,
                  fontSize: '9pt',
                }}
              >
                Teaching Aids:
              </span>
              <div
                className="teaching-aids-grid"
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '3px 8px',
                }}
              >
                <SquareCheckbox
                  label="Writing Board"
                  checked={sheetMode === 'blank' ? false : teachingAids.writingBoard}
                  onChange={(val) => setTeachingAids({ ...teachingAids, writingBoard: val })}
                />
                <SquareCheckbox
                  label="Charts"
                  checked={sheetMode === 'blank' ? false : teachingAids.charts}
                  onChange={(val) => setTeachingAids({ ...teachingAids, charts: val })}
                />
                <SquareCheckbox
                  label="Models"
                  checked={sheetMode === 'blank' ? false : teachingAids.models}
                  onChange={(val) => setTeachingAids({ ...teachingAids, models: val })}
                />
                <SquareCheckbox
                  label="Flashcards"
                  checked={sheetMode === 'blank' ? false : teachingAids.flashcards}
                  onChange={(val) => setTeachingAids({ ...teachingAids, flashcards: val })}
                />
                <SquareCheckbox
                  label="IWB"
                  checked={sheetMode === 'blank' ? false : teachingAids.iwb}
                  onChange={(val) => setTeachingAids({ ...teachingAids, iwb: val })}
                />
                <SquareCheckbox
                  label="Worksheet(s)"
                  checked={sheetMode === 'blank' ? false : teachingAids.worksheets}
                  onChange={(val) => setTeachingAids({ ...teachingAids, worksheets: val })}
                />
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', height: `${fieldHeightPx}px` }}>
                  <span style={{ marginRight: '4px', fontSize: '8.8pt', whiteSpace: 'nowrap' }}>Other:</span>
                  {renderFieldText(
                    formData.teachingAidsOther,
                    (val) => setFormData({ ...formData, teachingAidsOther: val }),
                    400
                  )}
                </div>
              </div>
            </div>

            {/* Methodology */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                paddingTop: '3px',
                borderTop: '1px solid #cccccc',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  minWidth: '95px',
                  color: '#000000',
                  paddingTop: '1px',
                  flexShrink: 0,
                  fontSize: '9pt',
                }}
              >
                Methodology:
              </span>
              <div
                className="methodology-grid"
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '3px 8px',
                }}
              >
                <SquareCheckbox
                  label="Lecture"
                  checked={sheetMode === 'blank' ? false : methodology.lecture}
                  onChange={(val) => setMethodology({ ...methodology, lecture: val })}
                />
                <SquareCheckbox
                  label="Discussion"
                  checked={sheetMode === 'blank' ? false : methodology.discussion}
                  onChange={(val) => setMethodology({ ...methodology, discussion: val })}
                />
                <SquareCheckbox
                  label="Role Play"
                  checked={sheetMode === 'blank' ? false : methodology.rolePlay}
                  onChange={(val) => setMethodology({ ...methodology, rolePlay: val })}
                />
                <SquareCheckbox
                  label="Demonstration"
                  checked={sheetMode === 'blank' ? false : methodology.demonstration}
                  onChange={(val) => setMethodology({ ...methodology, demonstration: val })}
                />
                <SquareCheckbox
                  label="Project Method"
                  checked={sheetMode === 'blank' ? false : methodology.projectMethod}
                  onChange={(val) => setMethodology({ ...methodology, projectMethod: val })}
                />
                <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'flex-end', height: `${fieldHeightPx}px` }}>
                  <span style={{ marginRight: '4px', fontSize: '8.8pt', whiteSpace: 'nowrap' }}>Other:</span>
                  {renderFieldText(
                    formData.methodologyOther,
                    (val) => setFormData({ ...formData, methodologyOther: val }),
                    400
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LESSON BODY SECTION */}
          <div
            className="lesson-body"
            data-section="lesson-body"
            style={{
              breakInside: 'auto',
              pageBreakInside: 'auto',
            }}
          >
            {/* SECTION 1: PREVIOUS KNOWLEDGE QUESTION / BRAINSTORMING (5 mins) — Exact 4 Ruled Lines */}
            <div className="section-block" style={{ marginBottom: `${sectionGapPx}px` }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontWeight: 700,
                  color: '#000000',
                  fontSize: '9.2pt',
                  marginBottom: '2px',
                }}
              >
                <span>Previous Knowledge Question/Brainstorming:</span>
                <span style={{ fontWeight: 600, fontSize: '8.5pt' }}>(5 mins)</span>
              </div>
              {[0, 1, 2, 3].map((idx) => (
                <div key={`pk-${idx}`} className="ruled-line" style={ruledLineStyle}>
                  {renderRuledContent(
                    formData.pkLines[idx] || '',
                    (val) => {
                      const newPk = [...formData.pkLines];
                      newPk[idx] = val;
                      setFormData({ ...formData, pkLines: newPk });
                    },
                    400
                  )}
                </div>
              ))}
            </div>

            {/* SECTION 2: CONTENT / ACTIVITIES (30 mins) — Exact 8 Ruled Lines */}
            <div className="section-block" style={{ marginBottom: `${sectionGapPx}px` }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontWeight: 700,
                  color: '#000000',
                  fontSize: '9.2pt',
                  marginBottom: '2px',
                }}
              >
                <span>Content/Activities:</span>
                <span style={{ fontWeight: 600, fontSize: '8.5pt' }}>(30 mins)</span>
              </div>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                <div key={`ca-${idx}`} className="ruled-line" style={ruledLineStyle}>
                  {renderRuledContent(
                    formData.contentLines[idx] || '',
                    (val) => {
                      const newContent = [...formData.contentLines];
                      newContent[idx] = val;
                      setFormData({ ...formData, contentLines: newContent });
                    },
                    400
                  )}
                </div>
              ))}
            </div>

            {/* SECTION 3: ASSESSMENT OF SLOS (10 mins) — Exact Checkboxes + 2 Ruled Lines */}
            <div className="section-block" style={{ marginBottom: `${sectionGapPx}px` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  fontSize: '8.8pt',
                  marginBottom: '3px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#000000', flexShrink: 0 }}>
                  Assessment of SLOs:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SquareCheckbox
                    label="Oral Questioning"
                    labelPosition="left"
                    checked={sheetMode === 'blank' ? false : assessmentMethods.oralQuestioning}
                    onChange={(val) => setAssessmentMethods({ ...assessmentMethods, oralQuestioning: val })}
                  />
                  <SquareCheckbox
                    label="Writing Summary"
                    labelPosition="left"
                    checked={sheetMode === 'blank' ? false : assessmentMethods.writingSummary}
                    onChange={(val) => setAssessmentMethods({ ...assessmentMethods, writingSummary: val })}
                  />
                  <SquareCheckbox
                    label="Writing Board Practice"
                    labelPosition="left"
                    checked={sheetMode === 'blank' ? false : assessmentMethods.writingBoardPractice}
                    onChange={(val) => setAssessmentMethods({ ...assessmentMethods, writingBoardPractice: val })}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  fontSize: '8.8pt',
                  marginBottom: '3px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <SquareCheckbox
                    label="Reinforcement worksheet(s)"
                    labelPosition="left"
                    checked={sheetMode === 'blank' ? false : assessmentMethods.reinforcementWorksheets}
                    onChange={(val) => setAssessmentMethods({ ...assessmentMethods, reinforcementWorksheets: val })}
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, height: `${fieldHeightPx}px` }}>
                    <span style={{ marginRight: '3px', fontSize: '8.8pt', whiteSpace: 'nowrap' }}>Other:</span>
                    {renderFieldText(
                      formData.assessmentOther,
                      (val) => setFormData({ ...formData, assessmentOther: val }),
                      400
                    )}
                  </div>
                </div>
                <span style={{ fontWeight: 600, fontSize: '8.5pt', flexShrink: 0, marginLeft: '4px' }}>
                  (10 mins)
                </span>
              </div>

              {/* 2 Ruled Lines for Assessment */}
              {[0, 1].map((idx) => (
                <div key={`as-${idx}`} className="ruled-line" style={ruledLineStyle}>
                  {renderRuledContent(
                    formData.assessmentLines[idx] || '',
                    (val) => {
                      const newAssess = [...formData.assessmentLines];
                      newAssess[idx] = val;
                      setFormData({ ...formData, assessmentLines: newAssess });
                    },
                    400
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: HOMEWORK — Exact 2 Ruled Lines */}
          <div className="section-block print-avoid-break" style={{ marginBottom: `${sectionGapPx}px` }}>
            <div style={fieldPairStyle}>
              <span style={{ fontWeight: 700, minWidth: 'max-content', marginRight: '4px', fontSize: '9.2pt' }}>
                Homework:
              </span>
              {renderFieldText(
                formData.homeworkLines[0] || '',
                (val) => {
                  const newHw = [...formData.homeworkLines];
                  newHw[0] = val;
                  setFormData({ ...formData, homeworkLines: newHw });
                },
                500
              )}
            </div>
            <div className="ruled-line" style={ruledLineStyle}>
              {renderRuledContent(
                formData.homeworkLines[1] || '',
                (val) => {
                  const newHw = [...formData.homeworkLines];
                  newHw[1] = val;
                  setFormData({ ...formData, homeworkLines: newHw });
                },
                500
              )}
            </div>
          </div>

          {/* SECTION 5: COORDINATOR'S REMARKS — Exact 2 Ruled Lines */}
          <div className="section-block print-avoid-break" style={{ marginBottom: `${sectionGapPx}px` }}>
            <div style={fieldPairStyle}>
              <span style={{ fontWeight: 700, minWidth: 'max-content', marginRight: '4px', fontSize: '9.2pt' }}>
                Coordinator's Remark(s):
              </span>
              {renderFieldText(
                formData.coordinatorLines[0] || '',
                (val) => {
                  const newRemarks = [...formData.coordinatorLines];
                  newRemarks[0] = val;
                  setFormData({ ...formData, coordinatorLines: newRemarks });
                },
                500
              )}
            </div>
            <div className="ruled-line" style={ruledLineStyle}>
              {renderRuledContent(
                formData.coordinatorLines[1] || '',
                (val) => {
                  const newRemarks = [...formData.coordinatorLines];
                  newRemarks[1] = val;
                  setFormData({ ...formData, coordinatorLines: newRemarks });
                },
                500
              )}
            </div>
          </div>

          {/* SECTION 6: TEACHER'S REMARKS — Exact 2 Ruled Lines */}
          <div className="section-block print-avoid-break" style={{ marginBottom: `${sectionGapPx}px` }}>
            <div style={fieldPairStyle}>
              <span style={{ fontWeight: 700, minWidth: 'max-content', marginRight: '4px', fontSize: '9.2pt' }}>
                Teacher's Remarks(s):
              </span>
              {renderFieldText(
                formData.teacherRemarkLines[0] || '',
                (val) => {
                  const newRemarks = [...formData.teacherRemarkLines];
                  newRemarks[0] = val;
                  setFormData({ ...formData, teacherRemarkLines: newRemarks });
                },
                500
              )}
            </div>
            <div className="ruled-line" style={ruledLineStyle}>
              {renderRuledContent(
                formData.teacherRemarkLines[1] || '',
                (val) => {
                  const newRemarks = [...formData.teacherRemarkLines];
                  newRemarks[1] = val;
                  setFormData({ ...formData, teacherRemarkLines: newRemarks });
                },
                500
              )}
            </div>
          </div>

          {/* SECTION 7: SIGNATURES FOOTER — Dual Signatures */}
          <div
            className="signature-row pt-1.5 print-avoid-break"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #000000',
              paddingTop: '6px',
              fontSize: '9.2pt',
              fontWeight: 700,
              height: `${lineHeightPx + 4}px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, maxWidth: '46%', height: `${lineHeightPx}px` }}>
              <span style={{ marginRight: '5px', flexShrink: 0 }}>Teacher Signature:</span>
              <div style={{ flex: 1, borderBottom: '1px solid #000000', height: `${fieldHeightPx}px` }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, maxWidth: '46%', height: `${lineHeightPx}px` }}>
              <span style={{ marginRight: '5px', flexShrink: 0 }}>Coordinator Signature:</span>
              <div style={{ flex: 1, borderBottom: '1px solid #000000', height: `${fieldHeightPx}px` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
