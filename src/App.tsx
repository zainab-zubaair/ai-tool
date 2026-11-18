import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { LessonPlannerView } from './components/LessonPlannerView';
import { SchoolWeeklyPlanner } from './components/SchoolWeeklyPlanner';
import { BiseExamBuilderView } from './components/BiseExamBuilderView';
import { WorksheetView } from './components/WorksheetView';
import { ResourceBankView } from './components/ResourceBankView';
import { ClassroomTimerModal } from './components/ClassroomTimerModal';
import { PhotoScannerModal } from './components/PhotoScannerModal';
import { GradeLevel, SubjectType, LessonPlan, BiseExamPaper, WorksheetData } from './types';
import { getSavedResources } from './utils/resourceBank';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialMode, setScannerInitialMode] = useState<'camera' | 'mobile' | 'upload'>('camera');
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  const [timerGradeTier, setTimerGradeTier] = useState<'early' | 'primary' | 'middle' | 'matric'>('matric');
  const [timerLessonTitle, setTimerLessonTitle] = useState('Newton\'s Second Law of Motion');

  // Re-edit states passed to respective views
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [editingExamPaper, setEditingExamPaper] = useState<BiseExamPaper | null>(null);
  const [editingWorksheet, setEditingWorksheet] = useState<WorksheetData | null>(null);

  // Bank item count
  const [bankCount, setBankCount] = useState(0);

  const refreshBankCount = () => {
    const list = getSavedResources();
    setBankCount(list.length);
  };

  useEffect(() => {
    refreshBankCount();
  }, [activeTab]);

  const [scannerPrefill, setScannerPrefill] = useState<{
    topic: string;
    grade?: GradeLevel;
    subject?: SubjectType;
    textbookInfo?: string;
    additionalNotes?: string;
    imageBase64?: string;
    imageMimeType?: string;
  } | null>(null);

  const handleOpenScanner = (mode: 'camera' | 'mobile' | 'upload' = 'camera') => {
    setScannerInitialMode(mode);
    setIsScannerOpen(true);
  };

  const handleOpenTimer = (
    tier: 'early' | 'primary' | 'middle' | 'matric' = 'primary',
    title: string = 'Current Lesson'
  ) => {
    setTimerGradeTier(tier);
    setTimerLessonTitle(title);
    setIsTimerOpen(true);
  };

  const handleApplyScannerData = (data: {
    topic: string;
    grade?: GradeLevel;
    subject?: SubjectType;
    textbookInfo?: string;
    additionalNotes?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => {
    setScannerPrefill(data);
    setActiveTab('planner');
  };

  const handleLoadLessonPlan = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setActiveTab('planner');
  };

  const handleLoadExamPaper = (paper: BiseExamPaper) => {
    setEditingExamPaper(paper);
    setActiveTab('bise-exam');
  };

  const handleLoadWorksheet = (worksheet: WorksheetData) => {
    setEditingWorksheet(worksheet);
    setActiveTab('worksheet');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={handleOpenScanner}
        onOpenTimer={() => handleOpenTimer('primary', 'Classroom Lesson')}
        bankCount={bankCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'planner' && (
          <LessonPlannerView
            onOpenTimer={handleOpenTimer}
            onOpenScanner={handleOpenScanner}
            externalPrefill={scannerPrefill}
            initialPlanToEdit={editingPlan}
            onSaveToBank={refreshBankCount}
          />
        )}

        {activeTab === 'weekly-planner' && (
          <SchoolWeeklyPlanner />
        )}

        {activeTab === 'bise-exam' && (
          <BiseExamBuilderView
            initialPaperToEdit={editingExamPaper}
            onSaveToBank={refreshBankCount}
          />
        )}

        {activeTab === 'worksheet' && (
          <WorksheetView
            initialWorksheetToEdit={editingWorksheet}
            onSaveToBank={refreshBankCount}
          />
        )}

        {activeTab === 'bank' && (
          <ResourceBankView
            onLoadLessonPlan={handleLoadLessonPlan}
            onLoadExamPaper={handleLoadExamPaper}
            onLoadWorksheet={handleLoadWorksheet}
          />
        )}
      </main>

      {/* Classroom Live Timer Modal */}
      <ClassroomTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        gradeTier={timerGradeTier}
        lessonTitle={timerLessonTitle}
      />

      {/* Photo Scanner Modal with Live Camera & Upload */}
      <PhotoScannerModal
        isOpen={isScannerOpen}
        initialMode={scannerInitialMode}
        onClose={() => setIsScannerOpen(false)}
        onApplyToPlanner={handleApplyScannerData}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="font-bold text-slate-200">
              Taleem Punjab • PTB Curriculum & BISE Exam Architect
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Aligned with Punjab Curriculum & Textbook Board (PCTB) Student Learning Outcomes (SLOs) & BISE Punjab examination boards.
            </div>
          </div>
          <div className="text-[11px] text-slate-400 text-center sm:text-right font-medium">
            Prep to Class 10 (Matric) • Local Storage Resource Bank • Objective, Short & Long Question Patterns
          </div>
        </div>
      </footer>
    </div>
  );
}
