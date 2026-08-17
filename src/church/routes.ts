import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { db } from './db.js';
import { authMiddleware, AuthRequest, generateToken, verifyPassword } from './auth.js';

export const apiRouter = Router();

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

// ==========================================
// 1. Public Student & Info Endpoints
// ==========================================

// Get student result by Student Code (Strictly returns only this student's result)
apiRouter.get('/public/result/:code', (req, res) => {
  const code = req.params.code;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'يرجى إدخال كود الطالب' });
    return;
  }

  const settings = db.getSettings();
  if (!settings.is_published) {
    res.status(403).json({ error: 'النتائج لم تُنشر بعد، برجاء مراجعة أمانة الخدمة.' });
    return;
  }

  const fullResult = db.getStudentFullResultByCode(code.trim());
  if (!fullResult) {
    res.status(404).json({ error: 'الكود غير صحيح أو غير موجود. تأكد من إدخال الكود المسلم لك من الخادم بدقة.' });
    return;
  }

  res.json({
    success: true,
    data: fullResult,
  });
});

// Public church & course info
apiRouter.get('/public/info', (req, res) => {
  const settings = db.getSettings();
  res.json({
    church_name: settings.church_name,
    course_name: settings.course_name,
    academic_year: settings.academic_year,
    spiritual_verse: settings.spiritual_verse,
    spiritual_verse_ref: settings.spiritual_verse_ref,
    announcement_text: settings.show_announcement ? settings.announcement_text : '',
    is_published: settings.is_published,
    allow_certificate_download: settings.allow_certificate_download,
    logo_url: settings.logo_url || '',
  });
});

// ==========================================
// 2. Authentication Endpoints
// ==========================================

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    return;
  }

  const user = db.getAdminUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    return;
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    },
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({
    user: req.user,
  });
});

apiRouter.post('/auth/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'يرجى ملء جميع الحقول' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' });
    return;
  }

  const user = db.getAdminUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'المستخدم غير موجود' });
    return;
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    return;
  }

  db.updateAdminPassword(user.id, newPassword);
  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

// ==========================================
// 3. Admin Protected Endpoints
// ==========================================

// Dashboard overview stats
apiRouter.get('/admin/stats', authMiddleware, (req, res) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

// Students List & Search
apiRouter.get('/admin/students', authMiddleware, (req, res) => {
  const { q, group } = req.query;
  let students = db.getStudents();

  if (typeof q === 'string' && q.trim()) {
    const term = q.trim().toLowerCase();
    students = students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.student_code.toLowerCase().includes(term) ||
        (s.phone && s.phone.includes(term))
    );
  }

  if (typeof group === 'string' && group.trim() && group !== 'all') {
    students = students.filter((s) => s.group === group);
  }

  // Attach results status to each student for table view
  const results = db.getResults();
  const subjects = db.getSubjects();

  const enriched = students.map((std) => {
    const stdResults = results.filter((r) => r.student_id === std.id);
    let total = 0;
    let max = 0;
    let passedCount = 0;

    subjects.forEach((sub) => {
      const r = stdResults.find((res) => res.subject_id === sub.id);
      const score = r ? r.score : 0;
      total += score;
      max += sub.max_score;
      if (score >= sub.min_pass_score) passedCount++;
    });

    const percentage = max > 0 ? Number(((total / max) * 100).toFixed(1)) : 0;
    const hasEnteredResults = stdResults.length > 0;

    return {
      ...std,
      results_count: stdResults.length,
      total_score: total,
      max_possible_score: max,
      percentage,
      has_entered_results: hasEnteredResults,
      is_passed: percentage >= 50 && passedCount === subjects.length,
    };
  });

  res.json({ students: enriched });
});

// Add Single Student
apiRouter.post('/admin/students', authMiddleware, (req, res) => {
  const { name, student_code, group, phone, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'اسم الطالب مطلوب' });
    return;
  }

  if (!student_code || !student_code.trim()) {
    res.status(400).json({ error: 'كود الطالب مطلوب' });
    return;
  }

  try {
    const student = db.addStudent({
      name: name.trim(),
      student_code: student_code.trim().toUpperCase(),
      group: group?.trim() || 'المجموعة الأولى',
      phone: phone?.trim() || '',
      notes: notes?.trim() || '',
    });

    res.status(201).json({ success: true, student });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إضافة الطالب' });
  }
});

// Bulk Import Students
apiRouter.post('/admin/students/batch-import', authMiddleware, (req, res) => {
  const { studentsList } = req.body; // Array of { name, student_code?, group?, phone? }

  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    res.status(400).json({ error: 'يرجى تقديم قائمة صالحة من الطلاب' });
    return;
  }

  const added: any[] = [];
  const errors: string[] = [];

  for (const item of studentsList) {
    const studentName = (typeof item === 'string' ? item : item.name)?.trim();
    if (!studentName) {
      continue;
    }

    try {
      const std = db.addStudent({
        name: studentName,
        student_code: item.student_code?.trim() || undefined,
        group: item.group?.trim() || 'الدفعة العامة',
        phone: item.phone?.trim() || '',
        notes: item.notes?.trim() || '',
      });
      added.push(std);
    } catch (err: any) {
      errors.push(`${studentName}: ${err.message}`);
    }
  }

  res.json({
    success: true,
    added_count: added.length,
    added,
    errors,
  });
});

// Update Student
apiRouter.put('/admin/students/:id', authMiddleware, (req, res) => {
  const id = getParam(req.params.id);
  const { name, student_code, group, phone, notes } = req.body;

  try {
    const updated = db.updateStudent(id, {
      ...(name && { name: name.trim() }),
      ...(student_code && { student_code: student_code.trim().toUpperCase() }),
      ...(group !== undefined && { group: group.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(notes !== undefined && { notes: notes.trim() }),
    });

    res.json({ success: true, student: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تحديث بيانات الطالب' });
  }
});

// Delete Student
apiRouter.delete('/admin/students/:id', authMiddleware, (req, res) => {
  const id = getParam(req.params.id);
  const deleted = db.deleteStudent(id);

  if (deleted) {
    res.json({ success: true, message: 'تم حذف الطالب وجميع درجاته بنجاح' });
  } else {
    res.status(404).json({ error: 'الطالب غير موجود' });
  }
});

// ==========================================
// Subjects Management
// ==========================================

apiRouter.get('/admin/subjects', authMiddleware, (req, res) => {
  res.json({ subjects: db.getSubjects() });
});

apiRouter.post('/admin/subjects', authMiddleware, (req, res) => {
  const { name, max_score, min_pass_score } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'اسم المادة مطلوب' });
    return;
  }

  const subject = db.addSubject({
    name: name.trim(),
    max_score: Number(max_score) || 20,
    min_pass_score: min_pass_score !== undefined ? Number(min_pass_score) : (Number(max_score) || 20) / 2,
  });

  res.status(201).json({ success: true, subject });
});

apiRouter.put('/admin/subjects/:id', authMiddleware, (req, res) => {
  const id = getParam(req.params.id);
  const { name, max_score, min_pass_score, order } = req.body;

  try {
    const updated = db.updateSubject(id, {
      ...(name && { name: name.trim() }),
      ...(max_score !== undefined && { max_score: Number(max_score) }),
      ...(min_pass_score !== undefined && { min_pass_score: Number(min_pass_score) }),
      ...(order !== undefined && { order: Number(order) }),
    });

    res.json({ success: true, subject: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تعديل المادة' });
  }
});

apiRouter.delete('/admin/subjects/:id', authMiddleware, (req, res) => {
  const id = getParam(req.params.id);
  const deleted = db.deleteSubject(id);

  if (deleted) {
    res.json({ success: true, message: 'تم حذف المادة ودرجاتها المرتبطة' });
  } else {
    res.status(404).json({ error: 'المادة غير موجودة' });
  }
});

// ==========================================
// Results & Grading
// ==========================================

// Get single student detailed result edit view
apiRouter.get('/admin/results/student/:studentId', authMiddleware, (req, res) => {
  const studentId = getParam(req.params.studentId);
  const student = db.getStudentById(studentId);

  if (!student) {
    res.status(404).json({ error: 'الطالب غير موجود' });
    return;
  }

  const subjects = db.getSubjects();
  const results = db.getResultsByStudentId(studentId);

  const scores = subjects.map((sub) => {
    const r = results.find((res) => res.subject_id === sub.id);
    return {
      subject_id: sub.id,
      subject_name: sub.name,
      max_score: sub.max_score,
      min_pass_score: sub.min_pass_score,
      score: r ? r.score : 0,
      has_score: !!r,
    };
  });

  res.json({
    student,
    scores,
  });
});

// Save scores for a single student
apiRouter.post('/admin/results/save-scores', authMiddleware, (req, res) => {
  const { student_id, scores } = req.body; // scores: [ { subject_id, score } ]

  if (!student_id || !Array.isArray(scores)) {
    res.status(400).json({ error: 'بيانات الدرجات غير مكتملة' });
    return;
  }

  try {
    const updated = db.setMultipleStudentScores(student_id, scores);
    res.json({ success: true, updated_count: updated.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حفظ الدرجات' });
  }
});

// Get full results matrix (for fast class-wide view & bulk editing)
apiRouter.get('/admin/results/grid', authMiddleware, (req, res) => {
  const { group } = req.query;
  let students = db.getStudents();

  if (typeof group === 'string' && group.trim() && group !== 'all') {
    students = students.filter((s) => s.group === group);
  }

  const subjects = db.getSubjects();
  const allResults = db.getResults();

  const matrix = students.map((std) => {
    const stdResults = allResults.filter((r) => r.student_id === std.id);
    const scoreMap: Record<string, number> = {};
    let total = 0;
    let max = 0;

    subjects.forEach((sub) => {
      const res = stdResults.find((r) => r.subject_id === sub.id);
      const score = res ? res.score : 0;
      scoreMap[sub.id] = score;
      total += score;
      max += sub.max_score;
    });

    const percentage = max > 0 ? Number(((total / max) * 100).toFixed(1)) : 0;

    return {
      student_id: std.id,
      student_name: std.name,
      student_code: std.student_code,
      group: std.group,
      scores: scoreMap,
      total_score: total,
      max_possible_score: max,
      percentage,
      overall_grade: db.getStudentFullResultByCode(std.student_code)?.totals.overall_grade || '',
    };
  });

  res.json({
    subjects,
    matrix,
  });
});

// Bulk update entire matrix
apiRouter.post('/admin/results/bulk-update-grid', authMiddleware, (req, res) => {
  const { updates } = req.body; // array of { student_id, scores: { [subject_id]: number } }

  if (!Array.isArray(updates)) {
    res.status(400).json({ error: 'بيانات غير صالحة' });
    return;
  }

  let totalUpdated = 0;
  for (const item of updates) {
    if (!item.student_id || !item.scores) continue;
    const scoreList = Object.entries(item.scores).map(([subject_id, score]) => ({
      subject_id,
      score: Number(score) || 0,
    }));
    db.setMultipleStudentScores(item.student_id, scoreList);
    totalUpdated++;
  }

  res.json({ success: true, updated_students_count: totalUpdated });
});

// ==========================================
// Settings & Admin Users
// ==========================================

apiRouter.get('/admin/settings', authMiddleware, (req, res) => {
  res.json({ settings: db.getSettings() });
});

apiRouter.put('/admin/settings', authMiddleware, (req, res) => {
  const updates = req.body;
  const updated = db.updateSettings(updates);
  res.json({ success: true, settings: updated });
});

apiRouter.get('/admin/users', authMiddleware, (req: AuthRequest, res) => {
  res.json({ users: db.getAdminUsers() });
});

apiRouter.post('/admin/users', authMiddleware, (req: AuthRequest, res) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'صلاحية غير كافية، يتطلب حساب أمين الخدمة' });
    return;
  }

  const { username, password, full_name, role } = req.body;

  if (!username || !password || !full_name) {
    res.status(400).json({ error: 'يرجى إكمال كافة البيانات المطلوبة' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 6 خانات' });
    return;
  }

  try {
    const newUser = db.addAdminUser({
      username,
      password,
      full_name,
      role: role || 'servant',
    });
    res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إضافة المستخدم' });
  }
});

apiRouter.delete('/admin/users/:id', authMiddleware, (req: AuthRequest, res) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'صلاحية غير كافية، يتطلب حساب أمين الخدمة' });
    return;
  }

  try {
    db.deleteAdminUser(getParam(req.params.id), req.user!.id);
    res.json({ success: true, message: 'تم حذف حساب الخادم بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف الحساب' });
  }
});

apiRouter.post('/admin/users/:id/reset-password', authMiddleware, (req: AuthRequest, res) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'صلاحية غير كافية، يتطلب حساب أمين الخدمة' });
    return;
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' });
    return;
  }

  try {
    db.resetAdminUserPassword(getParam(req.params.id), newPassword);
    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تعيين كلمة المرور' });
  }
});

// ==========================================
// Database Management & Backup / Migration
// ==========================================

apiRouter.get('/admin/database/export', authMiddleware, (req, res) => {
  const dump = db.exportFullDatabase();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=church_course_backup_${new Date().toISOString().slice(0, 10)}.json`);
  res.json(dump);
});

apiRouter.post('/admin/database/import', authMiddleware, (req: AuthRequest, res) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'صلاحية غير كافية، يتطلب حساب أمين الخدمة' });
    return;
  }

  const payload = req.body;
  if (!payload || (typeof payload !== 'object')) {
    res.status(400).json({ error: 'ملف غير صالح، يجب أن يكون بصيغة JSON صحيحة' });
    return;
  }

  try {
    const summary = db.importFullDatabase(payload);
    res.json({
      success: true,
      message: 'تم استيراد واستعادة قاعدة البيانات بنجاح',
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل استيراد قاعدة البيانات' });
  }
});

// Download entire project source code & data as a ZIP archive
apiRouter.get('/admin/project/download-zip', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const zip = new JSZip();
    const rootDir = process.cwd();

    const excludeDirs = new Set(['node_modules', '.git', 'dist', '.vite']);
    const excludeFiles = new Set(['.env']);

    function addDirToZip(currentDir: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.has(entry.name)) {
            const nestedZipFolder = zipFolder.folder(entry.name);
            if (nestedZipFolder) {
              addDirToZip(fullPath, nestedZipFolder);
            }
          }
        } else if (entry.isFile()) {
          if (!excludeFiles.has(entry.name)) {
            try {
              const fileContent = fs.readFileSync(fullPath);
              zipFolder.file(entry.name, fileContent);
            } catch {
              // skip unreadable files
            }
          }
        }
      }
    }

    addDirToZip(rootDir, zip);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `church_course_full_source_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل ضغط وتحميل ملفات المنظومة' });
  }
});


