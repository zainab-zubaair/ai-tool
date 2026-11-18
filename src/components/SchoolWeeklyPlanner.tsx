import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Download,
  Printer,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  MapPin,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { exportElementToPdf, triggerBrowserPrint, sanitizeFilename } from '../utils/pdfExport';

export interface ClassItem {
  id: string;
  time: string;
  subject: string;
  roomOrTeacher: string;
}

export interface HomeworkItem {
  id: string;
  subject: string;
  task: string;
  completed: boolean;
}

export interface DayPlan {
  dayName: string;
  shortName: string;
  classes: ClassItem[];
  homework: HomeworkItem[];
  dailyPriority: string;
}

export interface WeeklyPlannerState {
  weekStartDate: string; // YYYY-MM-DD (Monday)
  showWeekend: boolean;
  days: Record<string, DayPlan>; // keys: 'monday', 'tuesday', etc.
  overallGoals: { id: string; text: string; completed: boolean }[];
  parentTeacherNotes: string;
}

const STORAGE_KEY = 'school_weekly_planner_data_v2';

function getMondayOfCurrentWeek(dateInput?: Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatDateDisplay(mondayStr: string, dayOffset: number): string {
  try {
    const monday = new Date(mondayStr);
    monday.setDate(monday.getDate() + dayOffset);
    return monday.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

const DEFAULT_SAMPLE_PLANNER: WeeklyPlannerState = {
  weekStartDate: getMondayOfCurrentWeek(),
  showWeekend: false,
  days: {
    monday: {
      dayName: 'Monday',
      shortName: 'Mon',
      classes: [
        { id: 'm1', time: '08:00 - 08:45', subject: 'Mathematics', roomOrTeacher: 'Room 12 • Sir Tariq' },
        { id: 'm2', time: '08:50 - 09:35', subject: 'General Science', roomOrTeacher: 'Lab 1 • Miss Fatima' },
        { id: 'm3', time: '09:40 - 10:25', subject: 'English Grammar', roomOrTeacher: 'Room 12 • Miss Ayesha' },
        { id: 'm4', time: '11:00 - 11:45', subject: 'Urdu Literature', roomOrTeacher: 'Room 12 • Sir Raza' },
      ],
      homework: [
        { id: 'mh1', subject: 'Math', task: 'Complete Exercise 3.2 Q1 to Q5', completed: true },
        { id: 'mh2', subject: 'Science', task: 'Read Chapter 4 on Photosynthesis', completed: false },
      ],
      dailyPriority: 'Submit Science assignment and review algebra equations.',
    },
    tuesday: {
      dayName: 'Tuesday',
      shortName: 'Tue',
      classes: [
        { id: 't1', time: '08:00 - 08:45', subject: 'Biology', roomOrTeacher: 'Bio Lab • Dr. Nasir' },
        { id: 't2', time: '08:50 - 09:35', subject: 'Physics', roomOrTeacher: 'Physics Lab • Sir Imran' },
        { id: 't3', time: '09:40 - 10:25', subject: 'Pakistan Studies', roomOrTeacher: 'Room 14 • Sir Qasim' },
        { id: 't4', time: '11:00 - 11:45', subject: 'Computer Science', roomOrTeacher: 'Comp Lab • Miss Hina' },
      ],
      homework: [
        { id: 'th1', subject: 'Biology', task: 'Draw and label plant cell diagram in notebook', completed: false },
        { id: 'th2', subject: 'Physics', task: 'Solve numerical problems on Newton\'s 2nd Law', completed: false },
      ],
      dailyPriority: 'Chemistry quiz prep & submit practical notebooks.',
    },
    wednesday: {
      dayName: 'Wednesday',
      shortName: 'Wed',
      classes: [
        { id: 'w1', time: '08:00 - 08:45', subject: 'Chemistry', roomOrTeacher: 'Chem Lab • Sir Bilal' },
        { id: 'w2', time: '08:50 - 09:35', subject: 'Mathematics', roomOrTeacher: 'Room 12 • Sir Tariq' },
        { id: 'w3', time: '09:40 - 10:25', subject: 'English Essay', roomOrTeacher: 'Room 12 • Miss Ayesha' },
        { id: 'w4', time: '11:00 - 11:45', subject: 'Islamiat', roomOrTeacher: 'Room 12 • Qari Sb' },
      ],
      homework: [
        { id: 'wh1', subject: 'English', task: 'Write 200-word paragraph on "Role of Science"', completed: true },
        { id: 'wh2', subject: 'Islamiat', task: 'Memorize Surah Al-Hujurat translation verses 1-5', completed: false },
      ],
      dailyPriority: 'Prepare notes for Friday weekly mock test.',
    },
    thursday: {
      dayName: 'Thursday',
      shortName: 'Thu',
      classes: [
        { id: 'th1', time: '08:00 - 08:45', subject: 'General Science', roomOrTeacher: 'Lab 1 • Miss Fatima' },
        { id: 'th2', time: '08:50 - 09:35', subject: 'Urdu Nazm', roomOrTeacher: 'Room 12 • Sir Raza' },
        { id: 'th3', time: '09:40 - 10:25', subject: 'Physics Lab', roomOrTeacher: 'Physics Lab • Sir Imran' },
        { id: 'th4', time: '11:00 - 11:45', subject: 'Mathematics', roomOrTeacher: 'Room 12 • Sir Tariq' },
      ],
      homework: [
        { id: 'thh1', subject: 'Math', task: 'Review quadratic equations test review questions', completed: false },
        { id: 'thh2', subject: 'Urdu', task: 'Learn Tashreeh of Allama Iqbal poetry', completed: false },
      ],
      dailyPriority: 'Submit library books & verify project presentation.',
    },
    friday: {
      dayName: 'Friday',
      shortName: 'Fri',
      classes: [
        { id: 'f1', time: '08:00 - 08:45', subject: 'Weekly Assessment', roomOrTeacher: 'Main Exam Hall' },
        { id: 'f2', time: '08:50 - 09:35', subject: 'Computer Science Practical', roomOrTeacher: 'Comp Lab • Miss Hina' },
        { id: 'f3', time: '09:40 - 10:25', subject: 'English Comprehension', roomOrTeacher: 'Room 12 • Miss Ayesha' },
        { id: 'f4', time: '10:30 - 11:15', subject: 'Sports / Physical Education', roomOrTeacher: 'School Grounds' },
      ],
      homework: [
        { id: 'fh1', subject: 'All', task: 'Weekend Revision for upcoming Monthly BISE Board Test', completed: false },
        { id: 'fh2', subject: 'Science', task: 'Organize science project model for Monday display', completed: false },
      ],
      dailyPriority: 'Friday prayer break & weekly journal sign-off.',
    },
    saturday: {
      dayName: 'Saturday',
      shortName: 'Sat',
      classes: [
        { id: 's1', time: '09:00 - 10:30', subject: 'Weekend Science Club / Remedial', roomOrTeacher: 'Room 10' },
        { id: 's2', time: '10:45 - 12:00', subject: 'Maths Problem Solving Workshop', roomOrTeacher: 'Library Hall' },
      ],
      homework: [
        { id: 'sh1', subject: 'Self-Study', task: 'Complete past papers review paper 2024', completed: false },
      ],
      dailyPriority: 'Revision and clearing pending assignments.',
    },
    sunday: {
      dayName: 'Sunday',
      shortName: 'Sun',
      classes: [
        { id: 'su1', time: '10:00 - 11:30', subject: 'Self-Study & Revision', roomOrTeacher: 'Home Study Desk' },
      ],
      homework: [
        { id: 'suh1', subject: 'Planner', task: 'Review next week timetable and organize school bag', completed: false },
      ],
      dailyPriority: 'Pack school bag, uniform, and review Monday timetable.',
    },
  },
  overallGoals: [
    { id: 'g1', text: 'Score 90%+ on Friday Mathematics & Science assessment', completed: false },
    { id: 'g2', text: 'Complete all Chapter 4 textbook exercise questions in neat notebook', completed: true },
    { id: 'g3', text: 'Spend 45 minutes daily on English writing & vocabulary', completed: false },
    { id: 'g4', text: 'Prepare and organize the biology specimen presentation', completed: false },
  ],
  parentTeacherNotes:
    'Teacher Remarks: Active participation in science laboratory experiments. Keep maintaining neat homework notebooks.\nParent Note: Supervised 2 hours daily study session. All homework checked.',
};

export const SchoolWeeklyPlanner: React.FC = () => {
  const [plannerData, setPlannerData] = useState<WeeklyPlannerState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SAMPLE_PLANNER;
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const plannerRef = useRef<HTMLDivElement>(null);

  // New item draft states
  const [addingClassDay, setAddingClassDay] = useState<string | null>(null);
  const [newClassTime, setNewClassTime] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');

  const [addingHwDay, setAddingHwDay] = useState<string | null>(null);
  const [newHwSubject, setNewHwSubject] = useState('');
  const [newHwTask, setNewHwTask] = useState('');

  const [newGoalText, setNewGoalText] = useState('');

  // Save to localStorage on any state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerData));
      setSaveIndicator(true);
      const timer = setTimeout(() => setSaveIndicator(false), 1200);
      return () => clearTimeout(timer);
    } catch {
      // Ignored
    }
  }, [plannerData]);

  const handleWeekChange = (newDate: string) => {
    setPlannerData((prev) => ({
      ...prev,
      weekStartDate: newDate,
    }));
  };

  const shiftWeek = (offsetDays: number) => {
    setPlannerData((prev) => {
      const current = new Date(prev.weekStartDate || getMondayOfCurrentWeek());
      current.setDate(current.getDate() + offsetDays);
      return {
        ...prev,
        weekStartDate: current.toISOString().split('T')[0],
      };
    });
  };

  const handleToggleWeekend = () => {
    setPlannerData((prev) => ({
      ...prev,
      showWeekend: !prev.showWeekend,
    }));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all planner data for this week?')) {
      const emptyDays: Record<string, DayPlan> = {};
      const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      keys.forEach((k) => {
        const dName = k.charAt(0).toUpperCase() + k.slice(1);
        emptyDays[k] = {
          dayName: dName,
          shortName: dName.slice(0, 3),
          classes: [],
          homework: [],
          dailyPriority: '',
        };
      });

      setPlannerData((prev) => ({
        ...prev,
        days: emptyDays,
        overallGoals: [],
        parentTeacherNotes: '',
      }));
    }
  };

  const handleLoadSample = () => {
    setPlannerData(DEFAULT_SAMPLE_PLANNER);
  };

  // Class Management
  const handleAddClass = (dayKey: string) => {
    if (!newClassSubject.trim()) return;
    const newClass: ClassItem = {
      id: 'c_' + Date.now(),
      time: newClassTime.trim() || '09:00 - 09:45',
      subject: newClassSubject.trim(),
      roomOrTeacher: newClassRoom.trim() || 'Classroom',
    };

    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          classes: [...(prev.days[dayKey]?.classes || []), newClass],
        },
      },
    }));

    setNewClassTime('');
    setNewClassSubject('');
    setNewClassRoom('');
    setAddingClassDay(null);
  };

  const handleDeleteClass = (dayKey: string, classId: string) => {
    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          classes: prev.days[dayKey].classes.filter((c) => c.id !== classId),
        },
      },
    }));
  };

  // Homework Management
  const handleAddHomework = (dayKey: string) => {
    if (!newHwTask.trim()) return;
    const newHw: HomeworkItem = {
      id: 'hw_' + Date.now(),
      subject: newHwSubject.trim() || 'General',
      task: newHwTask.trim(),
      completed: false,
    };

    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          homework: [...(prev.days[dayKey]?.homework || []), newHw],
        },
      },
    }));

    setNewHwSubject('');
    setNewHwTask('');
    setAddingHwDay(null);
  };

  const handleToggleHomework = (dayKey: string, hwId: string) => {
    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          homework: prev.days[dayKey].homework.map((hw) =>
            hw.id === hwId ? { ...hw, completed: !hw.completed } : hw
          ),
        },
      },
    }));
  };

  const handleDeleteHomework = (dayKey: string, hwId: string) => {
    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          homework: prev.days[dayKey].homework.filter((hw) => hw.id !== hwId),
        },
      },
    }));
  };

  const handleUpdatePriority = (dayKey: string, priority: string) => {
    setPlannerData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          dailyPriority: priority,
        },
      },
    }));
  };

  // Goals Management
  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: 'g_' + Date.now(),
      text: newGoalText.trim(),
      completed: false,
    };
    setPlannerData((prev) => ({
      ...prev,
      overallGoals: [...prev.overallGoals, newGoal],
    }));
    setNewGoalText('');
  };

  const handleToggleGoal = (id: string) => {
    setPlannerData((prev) => ({
      ...prev,
      overallGoals: prev.overallGoals.map((g) =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    }));
  };

  const handleDeleteGoal = (id: string) => {
    setPlannerData((prev) => ({
      ...prev,
      overallGoals: prev.overallGoals.filter((g) => g.id !== id),
    }));
  };

  // Export to PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filename = `Weekly-Planner-${plannerData.weekStartDate || 'Week'}.pdf`;
      const target = plannerRef.current || document.getElementById('student-weekly-planner');
      if (target) {
        await exportElementToPdf(target as HTMLElement, filename, { orientation: 'landscape' });
      } else {
        await exportElementToPdf('student-weekly-planner', filename, { orientation: 'landscape' });
      }
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.warn('Planner PDF download error, fallback triggered:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Print Planner
  const handlePrint = async () => {
    const filename = `Weekly-Planner-${plannerData.weekStartDate || 'Week'}.pdf`;
    try {
      await triggerBrowserPrint('student-weekly-planner', filename);
    } catch {
      window.print();
    }
  };

  const activeDayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (plannerData.showWeekend) {
    activeDayKeys.push('saturday', 'sunday');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header / Control Toolbar (no-print) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Student & School Weekly Planner
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Academic Term
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Organize class timetables, daily homework tasks, exam priorities, and teacher notes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector Date Picker */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-slate-500 text-[11px]">Week of:</span>
            <input
              type="date"
              value={plannerData.weekStartDate}
              onChange={(e) => handleWeekChange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => shiftWeek(7)}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Toggle Weekend */}
          <button
            onClick={handleToggleWeekend}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              plannerData.showWeekend
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {plannerData.showWeekend ? 'Hide Sat/Sun' : '+ Sat / Sun'}
          </button>

          {/* Load Sample Data */}
          <button
            onClick={handleLoadSample}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Load comprehensive school timetable & tasks"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Sample Planner</span>
          </button>

          {/* Clear All */}
          <button
            onClick={handleClearAll}
            className="p-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-all"
            title="Clear all planner data"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
              pdfSuccess
                ? 'bg-emerald-600 ring-2 ring-emerald-300'
                : 'bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900'
            }`}
          >
            {isExportingPdf ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-200" />
                <span>Generating PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-emerald-200" />
                <span>Download as PDF</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-300" />
            <span>Print Planner</span>
          </button>
        </div>
      </div>

      {/* Auto-save notification pill (no-print) */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 no-print">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Automatic browser persistence enabled (changes saved to local storage)</span>
        </div>
        {saveIndicator && (
          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
            <Check className="h-3 w-3" /> Saved!
          </span>
        )}
      </div>

      {/* Main Printable Planner Sheet Container */}
      <div
        ref={plannerRef}
        id="student-weekly-planner"
        data-printable="true"
        className="printable-sheet bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-6"
      >
        {/* Printable Academic Header */}
        <div className="border-b-2 border-emerald-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-800">
              Academic Term • Student Weekly Timetable & Task Tracker
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              School Weekly Planner
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Week of Monday: <span className="font-bold text-slate-900">{plannerData.weekStartDate}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 flex flex-col sm:items-end gap-1">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800">
              <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
              <span>Student / Teacher Academic Record</span>
            </div>
            <span className="text-[10px] text-slate-400">Classrooms • Homework • Deadlines • Signatures</span>
          </div>
        </div>

        {/* 5 or 7 Column Weekly Layout Grid */}
        <div
          className={`grid gap-4 ${
            activeDayKeys.length > 5
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
          }`}
        >
          {activeDayKeys.map((dayKey, idx) => {
            const day = plannerData.days[dayKey] || {
              dayName: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
              shortName: dayKey.slice(0, 3),
              classes: [],
              homework: [],
              dailyPriority: '',
            };
            const dateStr = formatDateDisplay(plannerData.weekStartDate, idx);

            return (
              <div
                key={dayKey}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3.5 transition-all hover:border-slate-300"
              >
                {/* Day Header */}
                <div className="border-b border-slate-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">{day.dayName}</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {dateStr || day.shortName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center justify-between">
                    <span>{day.classes.length} Classes</span>
                    <span>
                      {day.homework.filter((h) => h.completed).length}/{day.homework.length} Done
                    </span>
                  </div>
                </div>

                {/* 1. Class Schedule Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-700" /> Classes
                    </span>
                    <button
                      onClick={() => setAddingClassDay(addingClassDay === dayKey ? null : dayKey)}
                      className="no-print text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {/* Inline Add Class Form (no-print) */}
                  {addingClassDay === dayKey && (
                    <div className="no-print p-2 bg-white rounded-lg border border-emerald-200 space-y-1.5 text-xs shadow-xs">
                      <input
                        type="text"
                        placeholder="Time (e.g. 08:30 - 09:15)"
                        value={newClassTime}
                        onChange={(e) => setNewClassTime(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Subject (e.g. Mathematics)"
                        value={newClassSubject}
                        onChange={(e) => setNewClassSubject(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Room / Teacher"
                        value={newClassRoom}
                        onChange={(e) => setNewClassRoom(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                      />
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingClassDay(null)}
                          className="px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddClass(dayKey)}
                          className="px-2.5 py-0.5 text-[10px] bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Class list */}
                  <div className="space-y-1.5">
                    {day.classes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No classes scheduled</p>
                    ) : (
                      day.classes.map((cls) => (
                        <div
                          key={cls.id}
                          className="group relative bg-white p-2 rounded-lg border border-slate-200 text-xs shadow-2xs hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-slate-900 leading-tight">
                              {cls.subject}
                            </span>
                            <button
                              onClick={() => handleDeleteClass(dayKey, cls.id)}
                              className="no-print opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-0.5"
                              title="Delete class"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                            {cls.time}
                          </div>
                          {cls.roomOrTeacher && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{cls.roomOrTeacher}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Assignments & Homework Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <FileCheck2 className="h-3 w-3 text-teal-700" /> Homework
                    </span>
                    <button
                      onClick={() => setAddingHwDay(addingHwDay === dayKey ? null : dayKey)}
                      className="no-print text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {/* Inline Add Homework Form (no-print) */}
                  {addingHwDay === dayKey && (
                    <div className="no-print p-2 bg-white rounded-lg border border-teal-200 space-y-1.5 text-xs shadow-xs">
                      <input
                        type="text"
                        placeholder="Subject (e.g. Math, Science)"
                        value={newHwSubject}
                        onChange={(e) => setNewHwSubject(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Homework task..."
                        value={newHwTask}
                        onChange={(e) => setNewHwTask(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                      />
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingHwDay(null)}
                          className="px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddHomework(dayKey)}
                          className="px-2.5 py-0.5 text-[10px] bg-teal-700 text-white font-bold rounded hover:bg-teal-800"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Homework list */}
                  <div className="space-y-1.5">
                    {day.homework.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No homework assigned</p>
                    ) : (
                      day.homework.map((hw) => (
                        <div
                          key={hw.id}
                          className={`group flex items-start justify-between gap-1.5 p-1.5 rounded-lg border transition-all text-xs ${
                            hw.completed
                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-400'
                              : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleHomework(dayKey, hw.id)}
                            className="flex items-start gap-1.5 flex-1 cursor-pointer select-none"
                          >
                            <span className="mt-0.5 text-emerald-700 shrink-0">
                              {hw.completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600" />
                              )}
                            </span>
                            <div className="leading-tight">
                              <span className="text-[9px] font-bold uppercase text-slate-500 block">
                                {hw.subject}
                              </span>
                              <span className={hw.completed ? 'line-through text-slate-400' : 'font-medium'}>
                                {hw.task}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteHomework(dayKey, hw.id)}
                            className="no-print opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-0.5"
                            title="Delete task"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Daily Priority / Exam Reminders */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5 text-amber-600" /> Priority & Exam
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Focus topic, test date, or reminders..."
                    value={day.dailyPriority}
                    onChange={(e) => handleUpdatePriority(dayKey, e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 resize-none font-medium"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Section: Overall Weekly Goals & Teacher / Parent Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t-2 border-slate-200">
          {/* Overall Weekly Goals */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Overall Weekly Academic Goals
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                {plannerData.overallGoals.filter((g) => g.completed).length}/
                {plannerData.overallGoals.length} Completed
              </span>
            </div>

            {/* Add Goal Input (no-print) */}
            <div className="flex items-center gap-1.5 no-print">
              <input
                type="text"
                placeholder="Add major weekly goal or study target..."
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                }}
                className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Add Goal
              </button>
            </div>

            {/* Goals List */}
            <div className="space-y-1.5">
              {plannerData.overallGoals.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No weekly goals set yet.</p>
              ) : (
                plannerData.overallGoals.map((g) => (
                  <div
                    key={g.id}
                    className={`group flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      g.completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleGoal(g.id)}
                      className="flex items-center gap-2 cursor-pointer flex-1 select-none"
                    >
                      {g.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400 hover:text-emerald-600 shrink-0" />
                      )}
                      <span className={g.completed ? 'line-through text-slate-400' : 'font-medium'}>
                        {g.text}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="no-print opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Teacher & Parent Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-800" />
                Teacher / Parent Notes & Signatures
              </h3>
              <p className="text-[11px] text-slate-500">
                Weekly teacher feedback, homework verification, and parent signature box.
              </p>
            </div>

            <textarea
              rows={4}
              value={plannerData.parentTeacherNotes}
              onChange={(e) =>
                setPlannerData((prev) => ({
                  ...prev,
                  parentTeacherNotes: e.target.value,
                }))
              }
              placeholder="Enter teacher remarks, weekly parent notes, or student self-reflection..."
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium resize-none"
            />

            {/* Signature Line on Print */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-700 block">Teacher's Signature:</span>
                <span className="text-[10px] text-slate-400 underline decoration-dotted">
                  ___________________________
                </span>
              </div>
              <div className="space-y-0.5 text-right">
                <span className="font-bold text-slate-700 block">Parent's Signature:</span>
                <span className="text-[10px] text-slate-400 underline decoration-dotted">
                  ___________________________
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
