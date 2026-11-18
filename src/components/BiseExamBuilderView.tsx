import React, { useState, useEffect } from 'react';
import {
  Award,
  Printer,
  Copy,
  Check,
  Sparkles,
  Download,
  AlertCircle,
  FileCheck2,
  Share2,
  HelpCircle,
  ChevronRight,
  FolderPlus,
  Zap
} from 'lucide-react';
import { BiseExamPaper, GradeLevel, SubjectType } from '../types';
import { BISE_BOARDS, GRADE_CONFIGS, EXEMPLAR_BISE_EXAMS } from '../data/punjabCurriculum';
import { saveResourceToBank } from '../utils/resourceBank';
import { exportElementToPdf, triggerPrintOrPdf } from '../utils/pdfExport';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface BiseExamBuilderViewProps {
  initialPaperToEdit?: BiseExamPaper | null;
  onSaveToBank?: () => void;
}

export const BiseExamBuilderView: React.FC<BiseExamBuilderViewProps> = ({
  initialPaperToEdit,
  onSaveToBank,
}) => {
  const [grade, setGrade] = useState<GradeLevel>('Class 9 (Matric SSC-I)');
  const [subject, setSubject] = useState<SubjectType>('Physics');
  const [topicOrChapters, setTopicOrChapters] = useState('Chapter 1 (Physical Quantities) & Chapter 2 (Kinematics) & Chapter 3 (Dynamics)');
  const [biseBoard, setBiseBoard] = useState('BISE Lahore');
  const [examType, setExamType] = useState('Monthly Test / Term Examination');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [timeAllowed, setTimeAllowed] = useState('1 Hour 45 Mins');
  const [schoolName, setSchoolName] = useState('Government Model High School / College, Punjab');
  const [medium, setMedium] = useState('Bilingual (English & Urdu)');

  const [loading, setLoading] = useState(false);
  const [examPaper, setExamPaper] = useState<BiseExamPaper | null>(
    (EXEMPLAR_BISE_EXAMS[0] as unknown as BiseExamPaper) || null
  );
  const [showMarkingScheme, setShowMarkingScheme] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [savedToBank, setSavedToBank] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fast live progress timer during generation
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

  // When loading a saved exam paper from Resource Bank
  React.useEffect(() => {
    if (initialPaperToEdit) {
      setExamPaper(initialPaperToEdit);
      if (initialPaperToEdit.header) {
        if (initialPaperToEdit.header.classGrade && GRADE_CONFIGS[initialPaperToEdit.header.classGrade as GradeLevel]) {
          setGrade(initialPaperToEdit.header.classGrade as GradeLevel);
        }
        if (initialPaperToEdit.header.subject) {
          setSubject(initialPaperToEdit.header.subject as SubjectType);
        }
        if (initialPaperToEdit.header.board) setBiseBoard(initialPaperToEdit.header.board);
        if (initialPaperToEdit.header.examTitle) setExamType(initialPaperToEdit.header.examTitle);
        if (initialPaperToEdit.header.totalMarks) setTotalMarks(initialPaperToEdit.header.totalMarks);
        if (initialPaperToEdit.header.timeAllowed) setTimeAllowed(initialPaperToEdit.header.timeAllowed);
        if (initialPaperToEdit.header.schoolName) setSchoolName(initialPaperToEdit.header.schoolName);
      }
    }
  }, [initialPaperToEdit]);

  const handleSaveToBank = () => {
    if (!examPaper) return;
    saveResourceToBank({
      type: 'exam_paper',
      title: `${examPaper.header.classGrade} ${examPaper.header.subject}: ${examPaper.header.examTitle}`,
      grade: examPaper.header.classGrade,
      subject: examPaper.header.subject,
      topic: topicOrChapters || examPaper.header.examTitle,
      notes: `${examPaper.header.board} paper with ${examPaper.header.totalMarks} marks. Time: ${examPaper.header.timeAllowed}.`,
      tags: ['BISE', 'Exam Paper', examPaper.header.subject, examPaper.header.classGrade],
      data: examPaper,
    });
    setSavedToBank(true);
    onSaveToBank?.();
    setTimeout(() => setSavedToBank(false), 2500);
  };

  const handleGenerateExam = async () => {
    if (!topicOrChapters.trim()) {
      setError('Please specify the chapters or syllabus topics for this exam paper.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-bise-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          topicOrChapters,
          biseBoard,
          examType,
          totalMarks,
          timeAllowed,
          schoolName,
          medium,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate exam paper.');
      }
      setExamPaper(data.paper);
    } catch (err: any) {
      setError(err.message || 'Error generating BISE exam paper.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!examPaper) return;
    setExportingPdf(true);
    try {
      const cleanSubject = examPaper.header.subject.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanGrade = examPaper.header.classGrade.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `BISE_Exam_${cleanGrade}_${cleanSubject}_${examPaper.header.totalMarks}Marks.pdf`;
      await exportElementToPdf('printable-exam', filename);
    } catch (e) {
      console.error('Failed to export exam PDF:', e);
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!examPaper) return;
    const cleanSubject = examPaper.header.subject.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanGrade = examPaper.header.classGrade.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `BISE_Exam_${cleanGrade}_${cleanSubject}_${examPaper.header.totalMarks}Marks.pdf`;
    await triggerPrintOrPdf('printable-exam', filename);
  };

  const handleCopy = () => {
    if (!examPaper) return;
    const text = formatExamAsText(examPaper);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExamAsText = (p: BiseExamPaper): string => {
    return `${p.header.schoolName}
${p.header.board} • ${p.header.examTitle}
Class: ${p.header.classGrade} | Subject: ${p.header.subject}
Time Allowed: ${p.header.timeAllowed} | Total Marks: ${p.header.totalMarks}
${p.header.rollNoPrompt}

GENERAL INSTRUCTIONS:
${p.instructions.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

-------------------------------------------------------------
${p.objectiveSection.title} (Marks: ${p.objectiveSection.marks})
${p.objectiveSection.instructions}
-------------------------------------------------------------
${p.objectiveSection.questions
  .map(
    (q) =>
      `Q${q.qNum}. ${q.questionEn}${q.questionUr ? `\n   ${q.questionUr}` : ''}\n   ` +
      q.options.map((o) => `[${o.key}] ${o.text}`).join('   ')
  )
  .join('\n\n')}

-------------------------------------------------------------
${p.subjectivePart1.title}
-------------------------------------------------------------
${p.subjectivePart1.sections
  .map(
    (sec) =>
      `${sec.qNumber}: ${sec.instructions}\n` +
      sec.questions
        .map((q) => `${q.subNum} ${q.questionEn}${q.questionUr ? ` (${q.questionUr})` : ''} [${q.marks} Marks]`)
        .join('\n')
  )
  .join('\n\n')}

-------------------------------------------------------------
${p.subjectivePart2.title}
${p.subjectivePart2.instructions}
-------------------------------------------------------------
${p.subjectivePart2.questions
  .map(
    (q) =>
      `${q.qNumber} (Total: ${q.totalMarks} Marks):\n` +
      q.parts
        .map(
          (prt) =>
            `   ${prt.partLabel} [${prt.type} - ${prt.marks} Marks]: ${prt.questionEn}${
              prt.questionUr ? `\n      ${prt.questionUr}` : ''
            }`
        )
        .join('\n')
  )
  .join('\n\n')}
`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-md no-print border border-purple-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-purple-700/80 text-purple-200 text-xs font-bold rounded-full uppercase tracking-wider">
              BISE Punjab Examination Hall Standard
            </span>
            <span className="text-xs text-purple-300">All 9 Punjab Educational Boards</span>
          </div>
          <h2 className="text-xl font-black mt-1">
            BISE Punjab Exam & Model Paper Builder
          </h2>
          <p className="text-xs text-purple-200 mt-0.5 max-w-2xl">
            Generates standardized question papers with Part I (Objective MCQs), Part II (Short Questions e.g. Attempt 5 out of 8), Part III (Long Questions with Part a Theory + Part b Numerical/Derivation), and official Marking Key.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[11px] text-purple-200 font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" /> Instant Model Paper (0s wait):
            </span>
            <button
              type="button"
              onClick={() => {
                const ex = EXEMPLAR_BISE_EXAMS[0];
                setExamPaper(ex as unknown as BiseExamPaper);
                setGrade(ex.header.classGrade as GradeLevel);
                setSubject(ex.header.subject as SubjectType);
                setBiseBoard(ex.header.board);
                setTotalMarks(ex.header.totalMarks);
                setTimeAllowed(ex.header.timeAllowed);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-700/80 hover:bg-purple-600 text-white text-[11px] font-bold border border-purple-500/50 shadow-xs transition-colors"
            >
              ⚡ Class 9 Physics (Ch 1-3) 50 Marks
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerateExam}
          disabled={loading}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              Compiling ({elapsedTimer}s)...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-purple-200" />
              Generate BISE Question Paper
            </>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exam Parameters (no-print) */}
        <div className="lg:col-span-4 space-y-4 no-print">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-purple-700" />
              Exam Parameters
            </h3>

            {/* Board Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target BISE Board
              </label>
              <select
                value={biseBoard}
                onChange={(e) => setBiseBoard(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {BISE_BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class / Level
              </label>
              <select
                value={grade}
                onChange={(e) => {
                  const g = e.target.value as GradeLevel;
                  setGrade(g);
                  const config = GRADE_CONFIGS[g];
                  if (!config.subjects.includes(subject)) {
                    setSubject(config.subjects[0]);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {Object.keys(GRADE_CONFIGS).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectType)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {GRADE_CONFIGS[grade].subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Syllabus Chapters / Topics */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Syllabus Chapters / Topics
              </label>
              <textarea
                value={topicOrChapters}
                onChange={(e) => setTopicOrChapters(e.target.value)}
                rows={3}
                placeholder="e.g. Chapter 1 & Chapter 2; or Specific Units..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Total Marks & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Total Marks
                </label>
                <select
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value={25}>25 Marks (Class Test)</option>
                  <option value={40}>40 Marks (Monthly Exam)</option>
                  <option value={50}>50 Marks (Mid-Term)</option>
                  <option value={60}>60 Marks (Board Half Book)</option>
                  <option value={75}>75 Marks (Full BISE Board)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Time Allowed
                </label>
                <input
                  type="text"
                  value={timeAllowed}
                  onChange={(e) => setTimeAllowed(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Medium & School Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Question Medium
              </label>
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="Bilingual (English & Urdu)">Bilingual (English & Urdu Side-by-Side)</option>
                <option value="English Medium">English Medium Only</option>
                <option value="Urdu Medium">Urdu Medium Only (اردو)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                School / College Header Name
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Fast Live Progress Indicator */}
            {loading && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    High-Speed BISE Engine Compiling...
                  </span>
                  <span className="font-mono font-bold text-purple-800 bg-white px-2 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    {elapsedTimer}s
                  </span>
                </div>
                <div className="w-full bg-purple-200/80 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-600 h-1.5 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-purple-800 font-medium">
                  {elapsedTimer < 1.5
                    ? 'Retrieving Punjab BISE syllabus distribution & blueprints...'
                    : elapsedTimer < 3.0
                    ? 'Balancing Part-I Objective MCQs, Short & Extensive Questions...'
                    : 'Compiling examiner marking scheme and step-marking rubric...'}
                </p>
              </div>
            )}

            <button
              onClick={handleGenerateExam}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Generating Exam Paper ({elapsedTimer}s)...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-purple-200" />
                  Generate BISE Paper Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Exam Paper Presentation */}
        <div className="lg:col-span-8 space-y-5">
          {examPaper ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Action Toolbar */}
              <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 no-print">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <FileCheck2 className="h-4 w-4 text-purple-700" />
                    BISE Question Paper
                  </span>
                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {examPaper.header.totalMarks} Marks
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMarkingScheme(!showMarkingScheme)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      showMarkingScheme
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    {showMarkingScheme ? 'Hide Examiner Scheme' : 'View Examiner Key & Scheme'}
                  </button>

                  <button
                    onClick={handleSaveToBank}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                      savedToBank
                        ? 'bg-purple-700 text-white'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300'
                    }`}
                    title="Save this exam paper to your local Resource Bank"
                  >
                    {savedToBank ? <Check className="h-3.5 w-3.5" /> : <FolderPlus className="h-3.5 w-3.5 text-purple-700" />}
                    <span>{savedToBank ? 'Saved in Bank!' : 'Save to Bank'}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="Share Exam Paper & Syllabus to WhatsApp"
                  >
                    <Share2 className="h-3.5 w-3.5 text-white" />
                    <span>Share to WhatsApp</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={exportingPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    title="Save this exam paper as a standalone PDF file to your device"
                  >
                    {exportingPdf ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 text-indigo-200" />
                        <span>Save as PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Print to PDF (Triggers browser print dialog using print-specific BISE examination styles from index.css)"
                  >
                    <Printer className="h-3.5 w-3.5 text-purple-200" />
                    <span>Print to PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable Paper Body */}
              <div id="printable-exam" className="printable-document print-friendly-only p-6 sm:p-8 space-y-6 text-slate-900">
                <div className="print-friendly-only space-y-6">
                {/* Official Exam Header */}
                <div className="border-b-2 border-slate-900 pb-3 space-y-1 print-avoid-break">
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <div className="text-sm font-black text-slate-900 uppercase">
                        {examPaper.header.schoolName}
                      </div>
                      <div className="text-xs font-bold text-purple-900">
                        {examPaper.header.board} • {examPaper.header.examTitle}
                      </div>
                    </div>
                    <div className="border border-slate-400 px-3 py-1 rounded text-xs font-mono font-bold bg-slate-50">
                      {examPaper.header.rollNoPrompt}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-200 font-semibold text-slate-700">
                    <div>Class: <span className="text-slate-900 font-bold">{examPaper.header.classGrade}</span></div>
                    <div>Subject: <span className="text-slate-900 font-bold">{examPaper.header.subject}</span></div>
                    <div>Time: <span className="text-slate-900 font-bold">{examPaper.header.timeAllowed}</span></div>
                    <div className="text-right">Max Marks: <span className="text-slate-900 font-bold">{examPaper.header.totalMarks}</span></div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-0.5">
                  <span className="font-bold text-slate-900 block text-xs">Note & Instructions:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {examPaper.instructions.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </div>

                {/* SECTION A: Objective (MCQs) */}
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex items-center justify-between text-xs font-bold">
                    <span>{examPaper.objectiveSection.title}</span>
                    <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[11px]">
                      {examPaper.objectiveSection.marks}
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-600 px-1">
                    {examPaper.objectiveSection.instructions}
                  </p>

                  <div className="space-y-3 pt-1">
                    {examPaper.objectiveSection.questions.map((q) => (
                      <div key={q.qNum} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs print-avoid-break">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-bold text-slate-900 flex-1">
                            <span>Q{q.qNum}. {q.questionEn}</span>
                          </div>
                          {q.questionUr && (
                            <div className="text-right font-urdu text-sm text-slate-900 flex-1" dir="rtl">
                              <span>سوال نمبر {q.qNum}۔ {q.questionUr}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium text-slate-800">
                          {q.options.map((opt) => (
                            <div
                              key={opt.key}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-1.5"
                            >
                              <span className="h-5 w-5 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                {opt.key}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION B: Subjective Part-I (Short Questions) */}
                <div className="space-y-4 pt-4 border-t-2 border-slate-200 print-avoid-break">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900">
                    {examPaper.subjectivePart1.title}
                  </div>

                  {examPaper.subjectivePart1.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-2 print-avoid-break">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-950 bg-purple-50/70 p-2 rounded-lg border border-purple-200">
                        <span>{sec.qNumber}: {sec.instructions}</span>
                        <span className="text-[11px] font-semibold text-purple-700">
                          Attempt any {sec.totalAllowed}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {sec.questions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 print-avoid-break"
                          >
                            <div className="flex-1">
                              <span className="font-bold text-slate-900 mr-2">{q.subNum}</span>
                              <span className="font-medium text-slate-800">{q.questionEn}</span>
                            </div>
                            {q.questionUr && (
                              <div className="text-right font-urdu text-xs text-slate-900 flex-1 sm:border-r sm:border-slate-200 sm:pr-3" dir="rtl">
                                {q.questionUr}
                              </div>
                            )}
                            <div className="text-slate-500 font-bold text-[11px] flex-shrink-0">
                              ({q.marks} Marks)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SECTION C: Subjective Part-II (Long Questions) */}
                <div className="space-y-4 pt-4 border-t-2 border-slate-200">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex items-center justify-between text-xs font-bold text-slate-900 print-avoid-break">
                    <span>{examPaper.subjectivePart2.title}</span>
                    <span className="text-[11px] text-slate-600 font-semibold">{examPaper.subjectivePart2.instructions}</span>
                  </div>

                  <div className="space-y-4">
                    {examPaper.subjectivePart2.questions.map((q, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white print-avoid-break">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between">
                          <span>{q.qNumber}</span>
                          <span className="text-purple-800">Total: {q.totalMarks} Marks</span>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                          {q.parts.map((prt, pIdx) => (
                            <div key={pIdx} className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 space-y-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <span className="font-bold text-purple-900 mr-2">{prt.partLabel}</span>
                                  <span className="text-[11px] font-bold text-slate-500 uppercase mr-2">[{prt.type}]:</span>
                                  <span className="font-medium text-slate-900">{prt.questionEn}</span>
                                </div>
                                <span className="font-bold text-slate-700 text-xs flex-shrink-0">
                                  ({prt.marks} Marks)
                                </span>
                              </div>
                              {prt.questionUr && (
                                <div className="text-right font-urdu text-xs text-slate-800 pt-1 border-t border-slate-100" dir="rtl">
                                  {prt.questionUr}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Sign-off Box */}
                <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-center text-xs text-slate-700 print-avoid-break">
                  <div className="border-t border-slate-400 pt-1 font-semibold">Invigilator's Signature: _________</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Examiner Code: _________</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Head Examiner / BISE Seal</div>
                </div>

                {/* Examiner Marking Scheme if toggled */}
                {showMarkingScheme && (
                  <div className="border-t-2 border-dashed border-purple-300 pt-6 space-y-4 no-print bg-purple-50/40 p-5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-700" />
                      <h4 className="font-bold text-purple-950 text-sm">
                        Confidential: BISE Official Examiner Marking Key & Rubric
                      </h4>
                    </div>

                    {/* Objective Key Table */}
                    <div>
                      <span className="font-bold text-xs text-slate-800 block mb-1.5 uppercase tracking-wider">
                        Objective Section Answer Key:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {examPaper.examinerMarkingScheme.objectiveKeyTable.map((item, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-purple-200 text-center text-xs">
                            <span className="text-slate-400 block text-[10px]">Q{item.q}</span>
                            <span className="font-extrabold text-purple-900 text-sm">{item.ans}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* General Checking Instructions */}
                    <div className="bg-white p-3 rounded-xl border border-purple-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-800 block mb-1">Board Examiner Checking Instructions:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                        {examPaper.examinerMarkingScheme.generalCheckingInstructions.map((ins, i) => (
                          <li key={i}>{ins}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center">
              <Award className="h-10 w-10 text-slate-400 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">No Exam Paper Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select the BISE Board, Grade, Subject, and Chapters on the left to compile a standard Punjab examination paper.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        examPaper={examPaper}
      />
    </div>
  );
};
