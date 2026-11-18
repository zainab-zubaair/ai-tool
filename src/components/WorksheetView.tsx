import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  RotateCw,
  Check,
  AlertCircle,
  HelpCircle,
  BookOpen,
  FolderPlus,
  Download
} from 'lucide-react';
import { GradeLevel, SubjectType, WorksheetData } from '../types';
import { GRADE_CONFIGS } from '../data/punjabCurriculum';
import { saveResourceToBank } from '../utils/resourceBank';
import { exportElementToPdf, triggerPrintOrPdf } from '../utils/pdfExport';

interface WorksheetViewProps {
  initialWorksheetToEdit?: WorksheetData | null;
  onSaveToBank?: () => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({
  initialWorksheetToEdit,
  onSaveToBank,
}) => {
  const [grade, setGrade] = useState<GradeLevel>('Class 5');
  const [subject, setSubject] = useState<SubjectType>('Mathematics');
  const [topic, setTopic] = useState('Addition and Subtraction of Unlike Fractions (PTB Chapter 3)');
  const [worksheetType, setWorksheetType] = useState('Mixed Concept & Review Sheet');

  const [loading, setLoading] = useState(false);
  const [savedToBank, setSavedToBank] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfSaved, setPdfSaved] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>({
    title: "Class 5 Mathematics: Fractions Practice & Review Sheet",
    grade: "Class 5",
    subject: "Mathematics",
    topic: "Addition and Subtraction of Unlike Fractions",
    sections: [
      {
        sectionTitle: "Section A: Concept Fill-in-the-Blanks",
        items: [
          { num: 1, prompt: "Before adding unlike fractions, we must find the ______ of the denominators.", answer: "Least Common Multiple (LCM)" },
          { num: 2, prompt: "Fractions that have the same denominator are called ______ fractions.", answer: "Like" },
          { num: 3, prompt: "The LCM of denominators 4 and 6 is ______.", answer: "12" },
          { num: 4, prompt: "1/2 is equal to ______ / 8.", answer: "4" }
        ]
      },
      {
        sectionTitle: "Section B: Solve the Following in Your Notebook",
        items: [
          { num: 1, prompt: "Evaluate: 2/3 + 1/6 (Show all steps)", answer: "4/6 + 1/6 = 5/6" },
          { num: 2, prompt: "Evaluate: 5/8 - 1/4 (Show all steps)", answer: "5/8 - 2/8 = 3/8" },
          { num: 3, prompt: "Word Problem: Asma used 1/3 meter of ribbon for gift packing and 1/2 meter for a school project. What is total length used?", answer: "1/3 + 1/2 = 2/6 + 3/6 = 5/6 meter" }
        ]
      }
    ],
    flashcards: [
      { front: "What is an Unlike Fraction?", back: "Fractions with different denominators (e.g., 1/2 and 1/3).", hint: "Look at the bottom number!" },
      { front: "How do you find the common denominator?", back: "By calculating the LCM (Least Common Multiple) of both denominators.", hint: "LCM method" },
      { front: "What is 3/4 - 1/4?", back: "2/4 = 1/2 (in simplest form).", hint: "Like fractions: subtract numerators directly" },
      { front: "Equivalent Fraction of 2/5 with denominator 15?", back: "6/15 (multiply numerator & denominator by 3).", hint: "2 × 3 / 5 × 3" },
      { front: "Can you add numerators when denominators are different?", back: "NO! You must convert them to like fractions first.", hint: "Essential Fraction Rule" }
    ],
    teacherNotes: "Common student misconception: Adding both numerators and denominators (e.g. 1/2 + 1/3 = 2/5). Ensure students use paper folding or LCM steps."
  });

  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please specify a lesson topic for this worksheet.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          topic,
          worksheetType,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate worksheet.');
      }
      setWorksheet(data.worksheet);
      setActiveFlashcardIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setError(err.message || 'Error communicating with worksheet generator.');
    } finally {
      setLoading(false);
    }
  };

  // When loading a saved worksheet from Resource Bank
  useEffect(() => {
    if (initialWorksheetToEdit) {
      setWorksheet(initialWorksheetToEdit);
      if (initialWorksheetToEdit.grade && GRADE_CONFIGS[initialWorksheetToEdit.grade as GradeLevel]) {
        setGrade(initialWorksheetToEdit.grade as GradeLevel);
      }
      if (initialWorksheetToEdit.subject) {
        setSubject(initialWorksheetToEdit.subject as SubjectType);
      }
      if (initialWorksheetToEdit.topic) setTopic(initialWorksheetToEdit.topic);
      setActiveFlashcardIndex(0);
      setIsFlipped(false);
    }
  }, [initialWorksheetToEdit]);

  const handleSaveToBank = () => {
    if (!worksheet) return;
    saveResourceToBank({
      type: 'worksheet',
      title: worksheet.title,
      grade: worksheet.grade,
      subject: worksheet.subject,
      topic: worksheet.topic,
      notes: `Classroom Practice Sheet with ${worksheet.sections.length} sections and ${worksheet.flashcards.length} revision flashcards.`,
      tags: ['Worksheet', 'Flashcards', worksheet.subject, worksheet.grade],
      data: worksheet,
    });
    setSavedToBank(true);
    onSaveToBank?.();
    setTimeout(() => setSavedToBank(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!worksheet) return;
    setExportingPdf(true);
    try {
      const cleanSubject = worksheet.subject.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanTopic = worksheet.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
      const cleanGrade = worksheet.grade.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Worksheet_${cleanGrade}_${cleanSubject}_${cleanTopic}.pdf`;
      await exportElementToPdf('printable-worksheet', filename);
      setPdfSaved(true);
      setTimeout(() => setPdfSaved(false), 2500);
    } catch (e) {
      console.error('Failed to export worksheet PDF:', e);
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!worksheet) return;
    const cleanSubject = worksheet.subject.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTopic = worksheet.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
    const cleanGrade = worksheet.grade.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Worksheet_${cleanGrade}_${cleanSubject}_${cleanTopic}.pdf`;
    await triggerPrintOrPdf('printable-worksheet', filename);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-900 text-white rounded-2xl p-5 shadow-md no-print border border-teal-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-700/80 text-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Classroom Resource
            </span>
            <span className="text-xs text-teal-300">Quick 1-Page Printable Practice Sheet & Flashcards</span>
          </div>
          <h2 className="text-xl font-black mt-1">
            Student Practice Worksheet & Concept Flashcards
          </h2>
          <p className="text-xs text-teal-200 mt-0.5 max-w-2xl">
            Generates a printable homework / classroom assessment worksheet with concept checks, word problems, plus an interactive 3D flip-card deck for daily revision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToBank}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
              savedToBank
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
            title="Save this worksheet to your local Resource Bank"
          >
            {savedToBank ? <Check className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
            <span>{savedToBank ? 'Saved in Bank!' : 'Save to Bank'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            className={`px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer ${
              pdfSaved
                ? 'bg-emerald-600 border border-emerald-500 ring-2 ring-emerald-300'
                : 'bg-emerald-800 hover:bg-emerald-700 border border-emerald-900'
            }`}
            title="Save as a standalone PDF file on your device"
          >
            {exportingPdf ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin text-emerald-300" />
                <span>Saving PDF...</span>
              </>
            ) : pdfSaved ? (
              <>
                <Check className="h-4 w-4 text-white" />
                <span>PDF Saved!</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-emerald-300" />
                <span>Save as PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Print to PDF (Triggers browser print dialog using print-specific worksheet styles from index.css)"
          >
            <Printer className="h-4 w-4 text-teal-200" />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form (no-print) */}
        <div className="lg:col-span-4 space-y-4 no-print">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="h-5 w-5 text-teal-700" />
              Worksheet Setup
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class / Grade
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
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {Object.keys(GRADE_CONFIGS).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectType)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {GRADE_CONFIGS[grade].subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Topic / Unit
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Fractions, Photosynthesis, Action Verbs..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Generating Worksheet...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-teal-200" />
                  Generate Worksheet & Flashcards
                </>
              )}
            </button>
          </div>

          {/* Interactive Flip Flashcards (no-print) */}
          {worksheet && worksheet.flashcards && worksheet.flashcards.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Classroom Revision Flashcards
                </span>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  Card {activeFlashcardIndex + 1} of {worksheet.flashcards.length}
                </span>
              </div>

              {/* Flashcard Box */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="min-h-48 p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 cursor-pointer flex flex-col justify-between text-center transition-all hover:shadow-md select-none"
              >
                <div className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                  {isFlipped ? 'Answer (Click to see Question)' : 'Question / Concept (Click to Flip)'}
                </div>

                <div className="my-auto">
                  {!isFlipped ? (
                    <div className="text-base font-bold text-slate-900 leading-snug">
                      {worksheet.flashcards[activeFlashcardIndex].front}
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-teal-950 leading-relaxed">
                      {worksheet.flashcards[activeFlashcardIndex].back}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1 text-[11px] text-teal-700 font-medium">
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Tap card to reveal {isFlipped ? 'question' : 'answer'}</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  disabled={activeFlashcardIndex === 0}
                  onClick={() => {
                    setActiveFlashcardIndex((prev) => prev - 1);
                    setIsFlipped(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={activeFlashcardIndex === worksheet.flashcards.length - 1}
                  onClick={() => {
                    setActiveFlashcardIndex((prev) => prev + 1);
                    setIsFlipped(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-600 disabled:opacity-40"
                >
                  Next Card
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Printable Student Worksheet */}
        <div className="lg:col-span-8 space-y-4">
          {worksheet ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Worksheet Document */}
              <div id="printable-worksheet" className="printable-document print-friendly-only p-6 sm:p-8 space-y-6 text-slate-900">
                <div className="print-friendly-only space-y-6">
                {/* Official Student Worksheet Header */}
                <div className="border-b-2 border-slate-900 pb-3 space-y-2 print-avoid-break">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-extrabold text-teal-900">
                        Government of the Punjab • Punjab Textbook Board
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        {worksheet.title}
                      </h2>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-500">
                      <div>Grade: <strong className="text-slate-900">{worksheet.grade}</strong></div>
                      <div>Subject: <strong className="text-slate-900">{worksheet.subject}</strong></div>
                    </div>
                  </div>

                  {/* Student info box */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs text-slate-700 font-medium">
                    <div className="border-b border-dotted border-slate-400 pb-1">Student Name: ____________________</div>
                    <div className="border-b border-dotted border-slate-400 pb-1">Roll No / Section: ____________</div>
                    <div className="border-b border-dotted border-slate-400 pb-1 text-right">Date: ____________________</div>
                  </div>
                </div>

                {/* Worksheet Sections */}
                <div className="space-y-6">
                  {worksheet.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-3">
                      <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 border-l-4 border-teal-700">
                        {sec.sectionTitle}
                      </div>

                      <div className="space-y-3 pl-2">
                        {sec.items.map((item) => (
                          <div key={item.num} className="text-xs space-y-1">
                            <div className="font-medium text-slate-900 flex items-start gap-2">
                              <span className="font-bold">{item.num}.</span>
                              <span className="leading-relaxed">{item.prompt}</span>
                            </div>
                            <div className="h-6 border-b border-slate-200 print-avoid-break" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Teacher Tip & Common Pitfall (no-print) */}
                {worksheet.teacherNotes && (
                  <div className="no-print mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <span className="font-bold block mb-0.5">Teacher Tip & Watch-out:</span>
                    <p>{worksheet.teacherNotes}</p>
                  </div>
                )}

                {/* Answer Key for Teacher (Printed at bottom) */}
                <div className="border-t-2 border-dashed border-slate-300 pt-4 text-xs text-slate-600 print-avoid-break">
                  <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">
                    Teacher Grading / Answer Key:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {worksheet.sections.map((sec, sIdx) =>
                      sec.items.map((item, iIdx) => (
                        <div key={`${sIdx}-${iIdx}`} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                          <span className="font-bold text-slate-700">Q{item.num}: </span>
                          <span className="text-teal-900 font-medium">{item.answer}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
