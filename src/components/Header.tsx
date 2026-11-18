import React from 'react';
import { BookOpen, FileCheck, Camera, FileSpreadsheet, Timer, Award, Sparkles, FolderArchive, CalendarDays } from 'lucide-react';

export type ActiveTab = 'planner' | 'weekly-planner' | 'bise-exam' | 'worksheet' | 'bank' | 'scanner' | 'timer';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenScanner: (mode?: 'camera' | 'mobile' | 'upload') => void;
  onOpenTimer: () => void;
  bankCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  onOpenTimer,
  bankCount = 0,
}) => {
  return (
    <header className="bg-emerald-800 text-white shadow-lg sticky top-0 z-40 no-print border-b border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('planner')}>
            <div className="h-11 w-11 rounded-full overflow-hidden shadow-md border-2 border-emerald-400/50 bg-white flex items-center justify-center shrink-0">
              <img src="/assets/aistudio/image_1e1d5a1b.png" alt="The Punjab School Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Taleem Punjab <span className="text-xs bg-emerald-600/80 text-emerald-100 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">PTCB & BISE</span>
                </h1>
                <span className="hidden md:inline-flex items-center text-xs font-urdu text-emerald-200">
                  تعلیم پنجاب نصابی منصوبہ ساز
                </span>
              </div>
              <p className="text-xs text-emerald-200 font-medium">
                Prep to Class 10 (Matric) • Punjab Textbook Board & Board Exam Pattern
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'planner'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-700/60'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Lesson Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('weekly-planner')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'weekly-planner'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-700/60'
              }`}
            >
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              <span>Weekly Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('bise-exam')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'bise-exam'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-700/60'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>BISE Exam Paper</span>
            </button>

            <button
              onClick={() => setActiveTab('worksheet')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'worksheet'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-700/60'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Worksheets</span>
            </button>

            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
                activeTab === 'bank'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-700/60'
              }`}
            >
              <FolderArchive className="h-4 w-4 text-amber-300" />
              <span className="hidden sm:inline">Resource Bank</span>
              <span className="sm:hidden">Bank</span>
              {bankCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'bank'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-amber-400 text-emerald-950'
                  }`}
                >
                  {bankCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onOpenScanner('camera')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-500/40 transition-all shadow-sm"
              title="Snap photo with live camera or upload textbook page"
            >
              <Camera className="h-4 w-4 text-emerald-300" />
              <span className="hidden md:inline">Camera Scan</span>
            </button>

            <button
              onClick={onOpenTimer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-500/40 transition-all shadow-sm"
              title="Open Live Lesson Teaching Timer with Bell Alerts"
            >
              <Timer className="h-4 w-4 text-teal-300" />
              <span className="hidden lg:inline">Lesson Timer</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
