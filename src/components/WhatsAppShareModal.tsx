import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Users,
  GraduationCap,
  MessageSquare,
  Smartphone,
  Send,
  Sparkles
} from 'lucide-react';
import {
  formatLessonPlanForWhatsApp,
  formatExamPaperForWhatsApp,
  generateWhatsAppLink,
  WhatsAppAudience
} from '../utils/whatsappShare';
import { LessonPlan, BiseExamPaper } from '../types';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: LessonPlan | null;
  examPaper?: BiseExamPaper | null;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  plan,
  examPaper,
}) => {
  const [audience, setAudience] = useState<WhatsAppAudience>('students');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  // Generate WhatsApp formatted text based on item type and chosen audience
  const formattedText = useMemo(() => {
    if (plan) {
      return formatLessonPlanForWhatsApp(plan, audience);
    }
    if (examPaper) {
      return formatExamPaperForWhatsApp(examPaper, audience);
    }
    return '';
  }, [plan, examPaper, audience]);

  // Construct direct WhatsApp link
  const whatsappUrl = useMemo(() => {
    return generateWhatsAppLink(formattedText, phoneNumber);
  }, [formattedText, phoneNumber]);

  if (!isOpen || (!plan && !examPaper)) return null;

  const itemTitle = plan
    ? `${plan.grade} ${plan.subject}: ${plan.topic}`
    : examPaper
    ? `${examPaper.header.classGrade} ${examPaper.header.subject} (${examPaper.header.examTitle})`
    : 'Document';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(formattedText);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold">Share to WhatsApp</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/40 rounded-full border border-white/20">
                  Instant Link
                </span>
              </div>
              <p className="text-xs text-emerald-100 truncate max-w-sm sm:max-w-md">
                {itemTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Audience Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Target Audience
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAudience('students')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  audience === 'students'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>For Students & Parents</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('staff')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  audience === 'staff'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>For Head Teacher / Staff</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
              {audience === 'students'
                ? 'Tailored for class groups: concise summary, key learning objectives, and clear homework tasks.'
                : 'Full professional format: includes Punjab curriculum SLOs, 3-phase duration breakdown, and rubrics.'}
            </p>
          </div>

          {/* Optional Direct Phone Number Input */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>Direct WhatsApp Number (Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">e.g. 923001234567</span>
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Leave empty to choose any contact / group in WhatsApp"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            />
          </div>

          {/* WhatsApp Chat Bubble Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live WhatsApp Message Preview</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {formattedText.length} characters
              </span>
            </div>

            {/* Simulated WhatsApp Chat Background */}
            <div className="p-3 bg-[#e5ddd5] dark:bg-slate-800 rounded-xl border border-slate-300 overflow-hidden shadow-inner max-h-56 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 shadow-sm max-w-lg border-l-4 border-l-emerald-500 font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text">
                {formattedText}
                <div className="mt-2 text-[10px] text-right text-slate-400 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Just now ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            {/* Copy Formatted Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm"
              title="Copy formatted text to paste in any app"
            >
              {textCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Text Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Copy WhatsApp Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm"
              title="Copy WhatsApp wa.me link"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Launch WhatsApp Button (Anchor avoids popup blockers in iframe) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-md shadow-emerald-600/20"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp Directly</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-75" />
          </a>
        </div>
      </div>
    </div>
  );
};
