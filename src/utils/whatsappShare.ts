import { LessonPlan, BiseExamPaper } from '../types';

export type WhatsAppAudience = 'students' | 'staff';

/**
 * Formats a Punjab PTCB Lesson Plan for WhatsApp with clean markdown (bold, lists, emojis).
 */
export function formatLessonPlanForWhatsApp(
  plan: LessonPlan,
  audience: WhatsAppAudience = 'students'
): string {
  if (audience === 'students') {
    // Student & Parent friendly format: clear, concise, actionable
    const homeworkText = plan.homework || 'Review notes and textbook reading.';
    const activitiesList = plan.phases.development.studentActivities.slice(0, 2).map((a) => `• ${a}`).join('\n');
    const exitCheck = plan.phases.conclusion.exitTicket ? `\n📌 *Self-Check Question:* ${plan.phases.conclusion.exitTicket}` : '';

    return [
      `🏫 *GOVERNMENT OF PUNJAB - SCHOOL EDUCATION*`,
      `📘 *Class:* ${plan.grade} | *Subject:* ${plan.subject}`,
      `🎯 *Today's Topic:* ${plan.topic}`,
      `⏱️ *Duration:* ${plan.duration}`,
      ``,
      `🎯 *What We Are Learning Today (Key Concepts):*`,
      ...plan.slos.slice(0, 3).map((slo, i) => `${i + 1}. ${slo}`),
      ``,
      `📝 *Classroom Activities:*`,
      activitiesList,
      exitCheck,
      ``,
      `🎒 *HOMEWORK / GOHAR TASK:*`,
      `👉 ${homeworkText}`,
      ``,
      `💡 _Prepared via Taleem Punjab PTCB Digital Planner_`,
    ].filter(Boolean).join('\n');
  }

  // Staff / Head Teacher / AEO / Inspection format: professional, complete pedagogical details
  const sloLines = plan.slos.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const materials = plan.materialsNeeded.join(', ');
  const p1 = plan.phases.introduction;
  const p2 = plan.phases.development;
  const p3 = plan.phases.conclusion;

  return [
    `🏛️ *PTCB LESSON PLAN - PUNJAB CURRICULUM*`,
    `📋 *Grade:* ${plan.grade}`,
    `📖 *Subject:* ${plan.subject}`,
    `🏷️ *Topic:* ${plan.topic}`,
    `⏱️ *Allotted Time:* ${plan.duration}`,
    `🗣️ *Medium:* ${plan.language}`,
    ``,
    `🎯 *Student Learning Outcomes (SLOs):*`,
    sloLines,
    ``,
    `📦 *Teaching Aids & Materials:*`,
    materials,
    ``,
    `⏳ *3-PHASE PEDAGOGICAL BREAKDOWN:*`,
    `1️⃣ *Introduction / Hook (${p1.duration}):* ${p1.title}`,
    `   • Teacher: ${p1.teacherActions[0] || 'Orientation'}`,
    `   • Student: ${p1.studentActivities[0] || 'Active participation'}`,
    p1.starterQuestionOrRhyme ? `   • Hook: "${p1.starterQuestionOrRhyme}"` : '',
    ``,
    `2️⃣ *Development & Guided Practice (${p2.duration}):* ${p2.title}`,
    `   • Teacher: ${p2.teacherActions[0] || 'Direct instruction'}`,
    `   • Student: ${p2.studentActivities[0] || 'Guided practice'}`,
    p2.boardSummary ? `   • Board Work: ${p2.boardSummary}` : '',
    ``,
    `3️⃣ *Evaluation & Conclusion (${p3.duration}):* ${p3.title}`,
    `   • Teacher: ${p3.teacherActions[0] || 'Wrap up check'}`,
    p3.exitTicket ? `   • Exit Ticket: ${p3.exitTicket}` : '',
    ``,
    `📚 *Homework Assignment:*`,
    plan.homework,
    ``,
    plan.biseMatricCorner?.applicable
      ? `🏆 *BISE Matric Corner:* Target Board: ${plan.biseMatricCorner.targetBoard || 'Punjab BISE Pattern'}\nFrequent Pitfalls: ${plan.biseMatricCorner.commonStudentPitfalls?.slice(0, 2).join('; ') || 'None identified'}`
      : '',
    ``,
    `✨ _Generated via Taleem Punjab PTCB Lesson Planner_`,
  ].filter((line) => line !== '').join('\n');
}

/**
 * Formats a BISE Punjab Exam Paper for WhatsApp with questions, instructions, and syllabus.
 */
export function formatExamPaperForWhatsApp(
  paper: BiseExamPaper,
  audience: WhatsAppAudience = 'students'
): string {
  const h = paper.header;

  if (audience === 'students') {
    // For students: Exam announcement, syllabus, format, and sample MCQs
    const sampleMcqs = paper.objectiveSection.questions.slice(0, 3).map((q, idx) => {
      const opts = q.options.map((o) => `[${o.key}] ${o.text}`).join('  ');
      return `*Q${idx + 1}.* ${q.questionEn}${q.questionUr ? ` (${q.questionUr})` : ''}\n   ${opts}`;
    }).join('\n\n');

    return [
      `📢 *EXAMINATION NOTICE & SYLLABUS*`,
      `🏫 *${h.schoolName}*`,
      `🏛️ *Board:* ${h.board} | *Class:* ${h.classGrade}`,
      `📖 *Subject:* ${h.subject}`,
      `📝 *Exam Title:* ${h.examTitle}`,
      `⏱️ *Time Allowed:* ${h.timeAllowed} | *Total Marks:* ${h.totalMarks}`,
      ``,
      `📋 *Important Instructions:*`,
      ...paper.instructions.slice(0, 3).map((ins, i) => `${i + 1}. ${ins}`),
      ``,
      `🎯 *Paper Format Breakdown:*`,
      `• *Part-I Objective:* ${paper.objectiveSection.marks || 'MCQs'}`,
      `• *Part-II Subjective:* Short & Long Questions`,
      ``,
      `💡 *Sample Practice Questions:*`,
      sampleMcqs,
      ``,
      `⚠️ _Students are advised to prepare all textbook exercises and past paper numericals._`,
      `✨ _Taleem Punjab - BISE Exam Suite_`,
    ].filter(Boolean).join('\n');
  }

  // For Staff / HOD / Examination Incharge
  const shortSec = paper.subjectivePart1.sections[0];
  const shortSummary = shortSec
    ? `${shortSec.qNumber}: ${shortSec.instructions} (${shortSec.questions.length} questions included)`
    : 'Short Questions configured';

  const longQuestions = paper.subjectivePart2.questions.slice(0, 2).map((lq) => {
    const parts = lq.parts.map((p) => `${p.partLabel} ${p.questionEn} [${p.marks}M]`).join(' | ');
    return `• ${lq.qNumber}: ${parts}`;
  }).join('\n');

  return [
    `📄 *BISE PUNJAB OFFICIAL EXAMINATION PAPER*`,
    `🏫 *School:* ${h.schoolName}`,
    `🏛️ *Affiliation:* ${h.board}`,
    `🎓 *Class:* ${h.classGrade} | *Subject:* ${h.subject}`,
    `📊 *Total Marks:* ${h.totalMarks} | *Time:* ${h.timeAllowed}`,
    `🏷️ *Type:* ${h.examTitle}`,
    ``,
    `📝 *PART - I (OBJECTIVE / MCQs):*`,
    `Total MCQs: ${paper.objectiveSection.questions.length} | Marks: ${paper.objectiveSection.marks}`,
    ``,
    `📝 *PART - II (SHORT QUESTIONS):*`,
    shortSummary,
    ``,
    `📝 *PART - III (LONG QUESTIONS):*`,
    longQuestions,
    ``,
    `🔑 *Examiner Marking Scheme:*`,
    `MCQ Answer Keys: ${paper.examinerMarkingScheme.objectiveKeyTable.map((k) => `Q${k.q}:${k.ans}`).join(', ')}`,
    ``,
    `✨ _Formatted for Punjab Teachers via Taleem Punjab_`,
  ].filter(Boolean).join('\n');
}

/**
 * Generates a standard, URI-encoded WhatsApp link (wa.me / api.whatsapp.com).
 * If phone number is supplied, links directly to that number; otherwise opens chat selector.
 */
export function generateWhatsAppLink(text: string, phone?: string): string {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
