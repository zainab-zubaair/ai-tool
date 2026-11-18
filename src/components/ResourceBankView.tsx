import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderArchive,
  Search,
  Filter,
  BookOpen,
  Award,
  FileSpreadsheet,
  Download,
  Upload,
  Trash2,
  Edit3,
  Eye,
  RotateCcw,
  Tag,
  Calendar,
  Check,
  X,
  FileText,
  Printer,
  Copy,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SavedResource, ResourceType, LessonPlan, BiseExamPaper, WorksheetData, GradeLevel, SubjectType } from '../types';
import {
  getSavedResources,
  deleteResourceFromBank,
  updateResourceInBank,
  exportBankToJson,
  importBankFromJson,
  resetBankToDefaults
} from '../utils/resourceBank';
import { exportElementToPdf } from '../utils/pdfExport';

interface ResourceBankViewProps {
  onLoadLessonPlan: (plan: LessonPlan) => void;
  onLoadExamPaper: (paper: BiseExamPaper) => void;
  onLoadWorksheet: (worksheet: WorksheetData) => void;
}

export const ResourceBankView: React.FC<ResourceBankViewProps> = ({
  onLoadLessonPlan,
  onLoadExamPaper,
  onLoadWorksheet,
}) => {
  const [resources, setResources] = useState<SavedResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Preview Modal
  const [previewResource, setPreviewResource] = useState<SavedResource | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Notes Modal
  const [editingResource, setEditingResource] = useState<SavedResource | null>(null);
  const [editNotesText, setEditNotesText] = useState('');
  const [editTagsText, setEditTagsText] = useState('');

  // Notifications / Feedback
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshResources = () => {
    setResources(getSavedResources());
  };

  useEffect(() => {
    refreshResources();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Unique lists for filter dropdowns
  const availableGrades = useMemo(() => {
    const set = new Set(resources.map((r) => r.grade).filter(Boolean));
    return Array.from(set);
  }, [resources]);

  const availableSubjects = useMemo(() => {
    const set = new Set(resources.map((r) => r.subject).filter(Boolean));
    return Array.from(set);
  }, [resources]);

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    return resources
      .filter((r) => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false;
        if (subjectFilter !== 'all' && r.subject !== subjectFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchTopic = r.topic.toLowerCase().includes(q);
          const matchSubject = r.subject.toLowerCase().includes(q);
          const matchGrade = r.grade.toLowerCase().includes(q);
          const matchNotes = (r.notes || '').toLowerCase().includes(q);
          const matchTags = (r.tags || []).some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchTopic || matchSubject || matchGrade || matchNotes || matchTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [resources, searchQuery, typeFilter, gradeFilter, subjectFilter, sortBy]);

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from your Resource Bank?`)) {
      deleteResourceFromBank(id);
      refreshResources();
      showStatus('Resource removed from local bank.');
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportBankToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Taleem_Punjab_Resource_Bank_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Exported Resource Bank backup successfully!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBankFromJson(content);
      if (res.success) {
        refreshResources();
        showStatus(`Successfully imported ${res.count} resources!`);
      } else {
        showStatus(res.error || 'Failed to import resources.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset Resource Bank to standard Punjab exemplar items? (Existing items will be replaced)')) {
      resetBankToDefaults();
      refreshResources();
      showStatus('Resource bank reset to default exemplars.');
    }
  };

  const handleSaveNotes = () => {
    if (!editingResource) return;
    const tagsArray = editTagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    updateResourceInBank(editingResource.id, {
      notes: editNotesText,
      tags: tagsArray,
    });
    setEditingResource(null);
    refreshResources();
    showStatus('Updated resource notes and tags.');
  };

  const handleLoadToEditor = (res: SavedResource) => {
    if (res.type === 'lesson_plan') {
      onLoadLessonPlan(res.data as LessonPlan);
    } else if (res.type === 'exam_paper') {
      onLoadExamPaper(res.data as BiseExamPaper);
    } else if (res.type === 'worksheet') {
      onLoadWorksheet(res.data as WorksheetData);
    }
  };

  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'lesson_plan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <BookOpen className="h-3 w-3" />
            Lesson Plan (PTB)
          </span>
        );
      case 'exam_paper':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Award className="h-3 w-3" />
            BISE Exam Paper
          </span>
        );
      case 'worksheet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <FileSpreadsheet className="h-3 w-3" />
            Worksheet & Cards
          </span>
        );
    }
  };

  const counts = useMemo(() => {
    const plans = resources.filter((r) => r.type === 'lesson_plan').length;
    const exams = resources.filter((r) => r.type === 'exam_paper').length;
    const sheets = resources.filter((r) => r.type === 'worksheet').length;
    return { all: resources.length, plans, exams, sheets };
  }, [resources]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-2xl p-5 shadow-md border border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-700/80 text-emerald-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Local Storage Bank
            </span>
            <span className="text-xs text-emerald-300">Offline & Fast Local Access</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2">
            <FolderArchive className="h-6 w-6 text-emerald-400" />
            Teacher's Resource Bank
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Saved collection of Punjab Textbook Board lesson plans, BISE examination papers, and classroom worksheets. Open any resource for immediate re-editing, printing, or offline backup.
          </p>
        </div>

        {/* Global Bank Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            title="Download JSON backup file to transfer to another PC or phone"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export Backup</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            title="Import a previously exported JSON backup file"
          >
            <Upload className="h-4 w-4 text-teal-400" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
            title="Restore standard Punjab exemplar plans"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        {/* Category Count Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Items</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('lesson_plan')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'lesson_plan'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Lesson Plans</span>
            <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
              {counts.plans}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('exam_paper')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'exam_paper'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>BISE Exam Papers</span>
            <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
              {counts.exams}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter('worksheet')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'worksheet'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Worksheets & Cards</span>
            <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
              {counts.sheets}
            </span>
          </button>
        </div>

        {/* Search, Filters, and Sorting Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, chapter, subject, or tag..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grade Filter */}
          <div className="sm:col-span-2">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="sm:col-span-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="newest">Sort: Newest Saved</option>
              <option value="oldest">Sort: Oldest Saved</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                {/* Top meta strip */}
                <div className="flex items-center justify-between gap-2">
                  {getTypeBadge(res.type)}
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(res.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title and details */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                    {res.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 font-medium">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                      {res.grade}
                    </span>
                    <span>•</span>
                    <span className="text-slate-800 font-semibold">{res.subject}</span>
                  </div>
                </div>

                {/* Topic snippet */}
                <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <strong className="text-slate-700">Topic: </strong>
                  {res.topic}
                </p>

                {/* Notes or tags */}
                {res.notes && (
                  <p className="text-[11px] text-slate-600 italic line-clamp-2">
                    "{res.notes}"
                  </p>
                )}

                {res.tags && res.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {res.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewResource(res)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Quick Preview & Print"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingResource(res);
                      setEditNotesText(res.notes || '');
                      setEditTagsText((res.tags || []).join(', '));
                    }}
                    className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Edit Notes & Tags"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(res.id, res.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Resource"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Open in Editor / Re-edit button */}
                <button
                  onClick={() => handleLoadToEditor(res)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <span>Open & Re-edit</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center">
          <FolderArchive className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No Matching Resources in Bank</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {searchQuery || typeFilter !== 'all' || gradeFilter !== 'all'
              ? 'Try clearing search filters, or click "Reset Defaults" above to load standard Punjab exemplar resources.'
              : 'Save generated lesson plans, BISE exam papers, or worksheets into your bank for quick offline re-use.'}
          </p>
          {(searchQuery || typeFilter !== 'all' || gradeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setGradeFilter('all');
                setSubjectFilter('all');
              }}
              className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Edit Notes & Tags Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Edit Resource Details: {editingResource.title.slice(0, 30)}...
              </h3>
              <button
                onClick={() => setEditingResource(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Notes / Instructions</label>
                <textarea
                  value={editNotesText}
                  onChange={(e) => setEditNotesText(e.target.value)}
                  rows={3}
                  placeholder="e.g. For class test on Thursday; special focus on numericals..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  value={editTagsText}
                  onChange={(e) => setEditTagsText(e.target.value)}
                  placeholder="e.g. Matric, BISE Lahore, Term 1, Important"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingResource(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 shadow-xs"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeBadge(previewResource.type)}
                <h3 className="font-bold text-sm text-slate-100 line-clamp-1">
                  {previewResource.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleLoadToEditor(previewResource);
                    setPreviewResource(null);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <span>Open in Editor</span>
                  <ArrowRight className="h-3 w-3" />
                </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('preview-resource-content');
                      if (el) {
                        const cleanName = previewResource.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
                        exportElementToPdf(el, `${cleanName}.pdf`);
                      }
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1"
                    title="Download standalone PDF document"
                  >
                    <Download className="h-4 w-4 text-emerald-300" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setPreviewResource(null)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content Preview */}
              <div id="preview-resource-content" className="p-6 overflow-y-auto space-y-4 text-xs bg-slate-50">
              {previewResource.type === 'lesson_plan' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-black text-slate-900">
                      {(previewResource.data as LessonPlan).title}
                    </h2>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      Class: {(previewResource.data as LessonPlan).grade} • Subject: {(previewResource.data as LessonPlan).subject} • Duration: {(previewResource.data as LessonPlan).duration}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Student Learning Outcomes (SLOs):
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {(previewResource.data as LessonPlan).slos?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="font-bold text-amber-950 block">Phase 1: Hook</span>
                      <p className="text-slate-700 mt-1">{(previewResource.data as LessonPlan).phases?.introduction?.title}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="font-bold text-emerald-950 block">Phase 2: Concept</span>
                      <p className="text-slate-700 mt-1">{(previewResource.data as LessonPlan).phases?.development?.title}</p>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="font-bold text-blue-950 block">Phase 3: Exit Ticket</span>
                      <p className="text-slate-700 mt-1">{(previewResource.data as LessonPlan).phases?.conclusion?.exitTicket || (previewResource.data as LessonPlan).phases?.conclusion?.title}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Homework:
                    </h4>
                    <p className="text-slate-700">{(previewResource.data as LessonPlan).homework}</p>
                  </div>
                </div>
              )}

              {previewResource.type === 'exam_paper' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <div className="text-sm font-black uppercase text-slate-900">
                      {(previewResource.data as BiseExamPaper).header?.schoolName}
                    </div>
                    <div className="text-xs text-purple-900 font-bold">
                      {(previewResource.data as BiseExamPaper).header?.board} • {(previewResource.data as BiseExamPaper).header?.examTitle}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Class: {(previewResource.data as BiseExamPaper).header?.classGrade} | Subject: {(previewResource.data as BiseExamPaper).header?.subject} | Total Marks: {(previewResource.data as BiseExamPaper).header?.totalMarks}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-950 text-xs mb-2">
                      {(previewResource.data as BiseExamPaper).objectiveSection?.title}
                    </h4>
                    <div className="space-y-2">
                      {(previewResource.data as BiseExamPaper).objectiveSection?.questions?.map((q) => (
                        <div key={q.qNum} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="font-bold">Q{q.qNum}. </span>
                          <span>{q.questionEn}</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1 text-[11px] text-slate-600">
                            {q.options?.map((opt) => (
                              <span key={opt.key}>[{opt.key}] {opt.text}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {previewResource.type === 'worksheet' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      {(previewResource.data as WorksheetData).title}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Grade: {(previewResource.data as WorksheetData).grade} | Subject: {(previewResource.data as WorksheetData).subject}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(previewResource.data as WorksheetData).sections?.map((sec, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <span className="font-bold text-slate-800 text-[11px] block bg-slate-100 p-1.5 rounded">
                          {sec.sectionTitle}
                        </span>
                        {sec.items?.map((it) => (
                          <div key={it.num} className="pl-2 text-slate-700">
                            {it.num}. {it.prompt}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Saved in your browser's persistent LocalStorage.</span>
              <button
                onClick={() => setPreviewResource(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
