import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Bell, CheckCircle2, ChevronRight, Volume2 } from 'lucide-react';

interface ClassroomTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeTier: 'early' | 'primary' | 'middle' | 'matric';
  lessonTitle?: string;
}

export const ClassroomTimerModal: React.FC<ClassroomTimerModalProps> = ({
  isOpen,
  onClose,
  gradeTier,
  lessonTitle = 'Active Class Lesson',
}) => {
  // Phase durations depending on tier
  const phaseDurations =
    gradeTier === 'early'
      ? [
          { name: 'Phase 1: Hook & Starter (Oral / Rhyme)', seconds: 5 * 60, color: 'from-amber-500 to-amber-600', advice: 'Engage students with flashcards, objects, or a short interactive rhyme. Minimal writing.' },
          { name: 'Phase 2: Core Activity & Guided Play', seconds: 20 * 60, color: 'from-emerald-500 to-teal-600', advice: 'Short 5-10 min interactive mini-activities, physical manipulation, drawing, pair discussion.' },
          { name: 'Phase 3: Oral Wrap-up & Star Assessment', seconds: 5 * 60, color: 'from-blue-500 to-indigo-600', advice: 'Check understanding orally, high-fives/stars, quick recap of the key word or letter.' },
        ]
      : gradeTier === 'matric'
      ? [
          { name: 'Phase 1: Recapitulation & BISE Hook', seconds: 5 * 60, color: 'from-amber-500 to-amber-600', advice: 'Quick review of prior formula/definition, hook with past BISE board question context.' },
          { name: 'Phase 2: Concept Delivery, Derivations & Numericals', seconds: 30 * 60, color: 'from-emerald-500 to-teal-600', advice: 'Write derivations clearly on board with step numbering; solve worked numericals with SI units.' },
          { name: 'Phase 3: BISE Exam Practice & Exit Slip', seconds: 10 * 60, color: 'from-blue-500 to-indigo-600', advice: 'Give 1 past board MCQ and 1 short question. Collect exit slip to identify misconceptions.' },
        ]
      : [
          { name: 'Phase 1: Hook & Prior Knowledge Check', seconds: 5 * 60, color: 'from-amber-500 to-amber-600', advice: 'Activate prior knowledge, introduce SLO clearly, pose an everyday life scenario.' },
          { name: 'Phase 2: Concept Building & Guided Group Practice', seconds: 25 * 60, color: 'from-emerald-500 to-teal-600', advice: 'Explain with diagram/worked example, engage students in pair/group notebook activity.' },
          { name: 'Phase 3: Evaluation, Summary & Exit Ticket', seconds: 10 * 60, color: 'from-blue-500 to-indigo-600', advice: 'Exit ticket problem, summarize key takeaways on the board, assign homework.' },
        ];

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(phaseDurations[0].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play audio chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  };

  useEffect(() => {
    setSecondsRemaining(phaseDurations[currentPhaseIndex].seconds);
  }, [currentPhaseIndex, gradeTier]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      playChime();
      if (currentPhaseIndex < phaseDurations.length - 1) {
        setCurrentPhaseIndex((prev) => prev + 1);
      } else {
        setIsRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining, currentPhaseIndex]);

  if (!isOpen) return null;

  const currentPhase = phaseDurations[currentPhaseIndex];
  const totalPhaseSeconds = currentPhase.seconds;
  const progressPercent = Math.max(0, Math.min(100, ((totalPhaseSeconds - secondsRemaining) / totalPhaseSeconds) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Bell className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Classroom Live Teaching Timer</h3>
              <p className="text-xs text-emerald-200 line-clamp-1">{lessonTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                soundEnabled ? 'bg-emerald-600/60 text-emerald-100' : 'bg-slate-700/60 text-slate-300'
              }`}
              title="Toggle Bell Sound"
            >
              <Volume2 className="h-4 w-4" />
              {soundEnabled ? 'Bell On' : 'Muted'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Phase Pills */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 border-b border-slate-200">
          {phaseDurations.map((p, idx) => {
            const isCurrent = idx === currentPhaseIndex;
            const isPast = idx < currentPhaseIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  setCurrentPhaseIndex(idx);
                  setIsRunning(false);
                }}
                className={`text-left p-3 rounded-xl border transition-all text-xs ${
                  isCurrent
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500 text-emerald-950 font-bold'
                    : isPast
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Step {idx + 1}
                  </span>
                  {isPast && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="font-semibold line-clamp-1">{p.name.split(':')[1]?.trim() || p.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">{Math.floor(p.seconds / 60)} mins</div>
              </button>
            );
          })}
        </div>

        {/* Big Countdown Timer Display */}
        <div className="p-8 text-center flex flex-col items-center justify-center bg-white">
          <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 mb-1">
            {currentPhase.name}
          </div>

          <div className="text-7xl font-mono font-black text-slate-900 tracking-tight my-4">
            {formatTime(secondsRemaining)}
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden my-3 border border-slate-200">
            <div
              className={`h-full bg-gradient-to-r ${currentPhase.color} transition-all duration-500`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Advice card for teacher */}
          <div className="max-w-md w-full bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 mt-4 text-xs text-emerald-900 text-left flex items-start gap-2.5">
            <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Teacher In-Class Focus: </span>
              {currentPhase.advice}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? 'Pause Timer' : 'Start Lesson Phase'}
            </button>

            <button
              onClick={() => {
                setIsRunning(false);
                setSecondsRemaining(currentPhase.seconds);
              }}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Phase
            </button>

            {currentPhaseIndex < phaseDurations.length - 1 && (
              <button
                onClick={() => {
                  setCurrentPhaseIndex((prev) => prev + 1);
                  setIsRunning(false);
                }}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
              >
                Next Phase
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Aligned with Punjab Curriculum Standard Time Distribution</span>
          <button onClick={onClose} className="font-semibold text-emerald-700 hover:underline">
            Close Timer
          </button>
        </div>
      </div>
    </div>
  );
};
