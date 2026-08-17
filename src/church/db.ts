import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DatabaseSchema, Student, Subject, Result, AdminUser, SystemSettings, StudentFullResult } from './types.js';

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(
  process.env.CHURCH_DATA_DIR || path.join(API_DIR, 'data'),
);
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function calculateGradeText(percentage: number): string {
  if (percentage >= 85) return 'ممتاز (A)';
  if (percentage >= 75) return 'جيد جداً (B)';
  if (percentage >= 65) return 'جيد (C)';
  if (percentage >= 50) return 'مقبول (D)';
  return 'يحتاج إعادة (F)';
}

function getInitialData(): DatabaseSchema {
  const initialSubjects: Subject[] = [
    { id: 'sub_1', name: 'كتاب مقدس', max_score: 100, min_pass_score: 50, order: 1 },
    { id: 'sub_2', name: 'تاريخ كنيسه', max_score: 100, min_pass_score: 50, order: 2 },
    { id: 'sub_3', name: 'طقس كنيسه', max_score: 100, min_pass_score: 50, order: 3 },
    { id: 'sub_4', name: 'العقيده', max_score: 100, min_pass_score: 50, order: 4 },
    { id: 'sub_5', name: 'دراسه تربيه', max_score: 100, min_pass_score: 50, order: 5 },
    { id: 'sub_6', name: 'تنميه مهارات', max_score: 100, min_pass_score: 50, order: 6 },
    { id: 'sub_7', name: 'دراسه روحيه', max_score: 100, min_pass_score: 50, order: 7 },
    { id: 'sub_8', name: 'الحان الكنيسه', max_score: 100, min_pass_score: 50, order: 8 },
    { id: 'sub_9', name: 'اللغه القبطيه', max_score: 100, min_pass_score: 50, order: 9 },
  ];

  // Admin accounts are provisioned explicitly through environment secrets.
  const initialAdmins: AdminUser[] = [];

  const initialSettings: SystemSettings = {
    church_name: 'كنيسة السيدة العذراء مريم و القديس مارمرقس و الاباء الرسل بسكينة - العوايد',
    course_name: 'مدرسة إعداد الخدام افا ماركوس السنه الاولي',
    academic_year: '2026',
    spiritual_verse: '«اللَّهُمَّ قَدْ عَلَّمْتَنِي مُنْذُ صِبَايَ، وَإِلَى هَذِهِ السَّاعَةِ أُخْبِرُ بِعَجَائِبِكَ. وَأَيْضًا إِلَى الشَّيْخُوخَةِ وَالشَّيْبِ، يَا اللَّهُ، لَا تَتْرُكْنِي، حَتَّى أُخْبِرَ بِذِرَاعِكَ الْجِيلَ الْمُقْبِلَ، وَبِقُوَّتِكَ كُلَّ آتٍ.»',
    spiritual_verse_ref: '(مز ٧١ : ١٧-١٨ )',
    announcement_text: 'تهنئ أمانة الخدمة جميع الإخوة والأخوات الخدام بنجاح الدورة، مع تمنياتنا بدوام النمو في المعرفة والنعمة.',
    show_announcement: true,
    is_published: false,
    allow_certificate_download: true,
    logo_url: '',
    secondary_logo_url: '',
  };

  return {
    students: [],
    subjects: initialSubjects,
    results: [],
    admin_users: initialAdmins,
    settings: initialSettings,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    this.ensureConfiguredAdmin();
  }

  private ensureConfiguredAdmin() {
    if (this.data.admin_users.length > 0) return;

    const username = (
      process.env.CHURCH_NEW_ADMIN_USERNAME ||
      process.env.CHURCH_ADMIN_USERNAME
    )?.trim();
    const password =
      process.env.CHURCH_NEW_ADMIN_PASSWORD || process.env.CHURCH_ADMIN_PASSWORD;
    if (!username || !password) return;

    const salt = bcrypt.genSaltSync(10);
    this.data.admin_users.push({
      id: 'adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username,
      password_hash: bcrypt.hashSync(password, salt),
      full_name:
        (
          process.env.CHURCH_NEW_ADMIN_FULL_NAME ||
          process.env.CHURCH_ADMIN_FULL_NAME
        )?.trim() || 'أمين خدمة إعداد الخدام',
      role: 'super_admin',
      created_at: new Date().toISOString(),
    });
    this.save();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, resetting to defaults:', err);
    }
    const initial = getInitialData();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error writing database file:', err);
    }
  }

  private save() {
    this.saveDirect(this.data);
  }

  // --- Students CRUD ---
  getStudents(): Student[] {
    return [...this.data.students];
  }

  getStudentById(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id);
  }

  getStudentByCode(code: string): Student | undefined {
    const normalize = (str: string) =>
      (str || '')
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .trim()
        .toLowerCase();

    const cleanCode = normalize(code);
    return this.data.students.find(
      (s) => normalize(s.student_code) === cleanCode
    );
  }

  generateNextStudentCode(): string {
    let maxNum = 100;
    for (const s of this.data.students) {
      const match = s.student_code.match(/KH-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    let nextNum = maxNum + 1;
    while (this.getStudentByCode(`KH-${nextNum}`)) {
      nextNum++;
    }
    return `KH-${nextNum}`;
  }

  addStudent(studentData: { name: string; student_code?: string; group?: string; phone?: string; notes?: string }): Student {
    let finalCode = studentData.student_code?.trim().toUpperCase();
    if (!finalCode) {
      finalCode = this.generateNextStudentCode();
    } else {
      const existing = this.getStudentByCode(finalCode);
      if (existing) {
        throw new Error(`كود الطالب "${finalCode}" مستخدم بالفعل لطالب آخر`);
      }
    }

    const newStudent: Student = {
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: studentData.name.trim(),
      student_code: finalCode,
      group: studentData.group?.trim() || 'المجموعة العامة',
      phone: studentData.phone?.trim() || '',
      notes: studentData.notes?.trim() || '',
      created_at: new Date().toISOString(),
    };

    this.data.students.push(newStudent);
    this.save();
    return newStudent;
  }

  updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'created_at'>>): Student {
    const index = this.data.students.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('الطالب غير موجود');
    }

    if (updates.student_code) {
      const cleanCode = updates.student_code.trim().toUpperCase();
      const existing = this.data.students.find(
        (s) => s.id !== id && s.student_code.trim().toUpperCase() === cleanCode
      );
      if (existing) {
        throw new Error(`كود الطالب "${updates.student_code}" مستخدم بالفعل`);
      }
      updates.student_code = cleanCode;
    }

    this.data.students[index] = {
      ...this.data.students[index],
      ...updates,
    };
    this.save();
    return this.data.students[index];
  }

  deleteStudent(id: string): boolean {
    const initialLen = this.data.students.length;
    this.data.students = this.data.students.filter((s) => s.id !== id);
    // Also cascade delete results
    this.data.results = this.data.results.filter((r) => r.student_id !== id);
    this.save();
    return this.data.students.length < initialLen;
  }

  // --- Subjects CRUD ---
  getSubjects(): Subject[] {
    return [...this.data.subjects]
      .map((subject) => ({
        ...subject,
        parent_id: subject.parent_id || null,
        is_category: Boolean(subject.is_category),
      }))
      .sort((a, b) => a.order - b.order);
  }

  getScorableSubjects(): Subject[] {
    return this.getSubjects().filter((subject) => !subject.is_category);
  }

  getSubjectById(id: string): Subject | undefined {
    return this.data.subjects.find((s) => s.id === id);
  }

  addSubject(
    subjectData: Omit<Subject, 'id' | 'order'> & {
      order?: number;
      parent_id?: string | null;
      is_category?: boolean;
    }
  ): Subject {
    const parentId = subjectData.parent_id || null;
    const isCategory = Boolean(subjectData.is_category);

    if (isCategory && parentId) {
      throw new Error('المادة الرئيسية لا يمكن أن تكون داخل قسم آخر');
    }
    if (parentId) {
      const parent = this.data.subjects.find((subject) => subject.id === parentId);
      if (!parent) throw new Error('القسم الرئيسي غير موجود');
      if (!parent.is_category) throw new Error('اختر مادة رئيسية صالحة لإضافة القسم');
    }

    const defaultMax = isCategory ? 0 : (Number(subjectData.max_score) || 20);
    const newSubject: Subject = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: subjectData.name.trim(),
      max_score: defaultMax,
      min_pass_score: isCategory ? 0 : (Number(subjectData.min_pass_score) || defaultMax / 2),
      order: subjectData.order ?? (this.data.subjects.length + 1),
      parent_id: parentId,
      is_category: isCategory,
    };

    this.data.subjects.push(newSubject);
    this.save();
    return newSubject;
  }

  updateSubject(id: string, updates: Partial<Omit<Subject, 'id'>>): Subject {
    const index = this.data.subjects.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('المادة غير موجودة');
    }

    this.data.subjects[index] = {
      ...this.data.subjects[index],
      ...updates,
      parent_id:
        updates.parent_id !== undefined
          ? (updates.parent_id || null)
          : this.data.subjects[index].parent_id || null,
      max_score: updates.max_score !== undefined ? Number(updates.max_score) : this.data.subjects[index].max_score,
      min_pass_score: updates.min_pass_score !== undefined ? Number(updates.min_pass_score) : this.data.subjects[index].min_pass_score,
    };
    this.save();
    return this.data.subjects[index];
  }

  deleteSubject(id: string): boolean {
    const initialLen = this.data.subjects.length;
    const idsToDelete = new Set([id]);
    this.data.subjects.forEach((subject) => {
      if (subject.parent_id === id) idsToDelete.add(subject.id);
    });
    this.data.subjects = this.data.subjects.filter((s) => !idsToDelete.has(s.id));
    // Cascade delete results for the material and its sections.
    this.data.results = this.data.results.filter((r) => !idsToDelete.has(r.subject_id));
    this.save();
    return this.data.subjects.length < initialLen;
  }

  // --- Results CRUD ---
  getResults(): Result[] {
    return [...this.data.results];
  }

  getResultsByStudentId(studentId: string): Result[] {
    return this.data.results.filter((r) => r.student_id === studentId);
  }

  setStudentScore(studentId: string, subjectId: string, score: number): Result {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const subject = this.getSubjectById(subjectId);
    if (!subject) throw new Error('المادة غير موجودة');

    const numScore = Math.max(0, Math.min(subject.max_score, Number(score)));

    const existingIndex = this.data.results.findIndex(
      (r) => r.student_id === studentId && r.subject_id === subjectId
    );

    if (existingIndex >= 0) {
      this.data.results[existingIndex].score = numScore;
      this.data.results[existingIndex].updated_at = new Date().toISOString();
      this.save();
      return this.data.results[existingIndex];
    } else {
      const newResult: Result = {
        id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        student_id: studentId,
        subject_id: subjectId,
        score: numScore,
        updated_at: new Date().toISOString(),
      };
      this.data.results.push(newResult);
      this.save();
      return newResult;
    }
  }

  setMultipleStudentScores(studentId: string, scores: { subject_id: string; score: number }[]): Result[] {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const updatedResults: Result[] = [];

    for (const item of scores) {
      const subject = this.getSubjectById(item.subject_id);
      if (!subject) continue;

      const numScore = Math.max(0, Math.min(subject.max_score, Number(item.score)));
      const existingIndex = this.data.results.findIndex(
        (r) => r.student_id === studentId && r.subject_id === item.subject_id
      );

      if (existingIndex >= 0) {
        this.data.results[existingIndex].score = numScore;
        this.data.results[existingIndex].updated_at = new Date().toISOString();
        updatedResults.push(this.data.results[existingIndex]);
      } else {
        const newResult: Result = {
          id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          student_id: studentId,
          subject_id: item.subject_id,
          score: numScore,
          updated_at: new Date().toISOString(),
        };
        this.data.results.push(newResult);
        updatedResults.push(newResult);
      }
    }

    this.save();
    return updatedResults;
  }

  // --- Student Full Result for Public / View ---
  getStudentFullResultByCode(studentCode: string): StudentFullResult | null {
    const student = this.getStudentByCode(studentCode);
    if (!student) return null;

    const subjects = this.getSubjects();
    const results = this.getResultsByStudentId(student.id);

    let totalScore = 0;
    let maxPossibleScore = 0;
    let passedSubjectsCount = 0;

    const subjectItems = subjects.map((sub) => {
      const res = results.find((r) => r.subject_id === sub.id);
      const score = res ? res.score : 0;
      const percentage = sub.max_score > 0 ? (score / sub.max_score) * 100 : 0;
      const isPassed = score >= sub.min_pass_score;
      if (isPassed) passedSubjectsCount++;

      totalScore += score;
      maxPossibleScore += sub.max_score;

      return {
        subject_id: sub.id,
        subject_name: sub.name,
        score,
        max_score: sub.max_score,
        min_pass_score: sub.min_pass_score,
        percentage: Number(percentage.toFixed(1)),
        grade_text: calculateGradeText(percentage),
        is_passed: isPassed,
      };
    });

    const overallPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const overallGrade = calculateGradeText(overallPercentage);
    const isOverallPassed = overallPercentage >= 50 && passedSubjectsCount === subjects.length;

    return {
      student: {
        id: student.id,
        name: student.name,
        student_code: student.student_code,
        group: student.group,
      },
      subjects: subjectItems,
      totals: {
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage: Number(overallPercentage.toFixed(1)),
        overall_grade: overallGrade,
        is_passed: isOverallPassed,
        subjects_count: subjects.length,
        passed_subjects_count: passedSubjectsCount,
      },
      church_info: {
        church_name: this.data.settings.church_name,
        course_name: this.data.settings.course_name,
        academic_year: this.data.settings.academic_year,
        spiritual_verse: this.data.settings.spiritual_verse,
        spiritual_verse_ref: this.data.settings.spiritual_verse_ref,
        logo_url: this.data.settings.logo_url || '',
        secondary_logo_url: this.data.settings.secondary_logo_url || '',
      },
    };
  }

  // --- Admin Users ---
  getAdminUsers(): Omit<AdminUser, 'password_hash'>[] {
    return this.data.admin_users.map(({ password_hash, ...rest }) => rest);
  }

  getAdminUserByUsername(username: string): AdminUser | undefined {
    return this.data.admin_users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  getAdminUserById(id: string): AdminUser | undefined {
    return this.data.admin_users.find((u) => u.id === id);
  }

  addAdminUser(data: { username: string; password: string; full_name: string; role?: 'super_admin' | 'servant' }): Omit<AdminUser, 'password_hash'> {
    const existing = this.getAdminUserByUsername(data.username);
    if (existing) {
      throw new Error('اسم المستخدم موجود بالفعل');
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(data.password, salt);

    const newAdmin: AdminUser = {
      id: 'adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username: data.username.trim(),
      password_hash,
      full_name: data.full_name.trim(),
      role: data.role || 'servant',
      created_at: new Date().toISOString(),
    };

    this.data.admin_users.push(newAdmin);
    this.save();

    const { password_hash: _, ...safeUser } = newAdmin;
    return safeUser;
  }

  deleteAdminUser(id: string, requesterId: string): boolean {
    const adminIndex = this.data.admin_users.findIndex((u) => u.id === id);
    if (adminIndex === -1) throw new Error('المستخدم غير موجود');

    if (this.data.admin_users[adminIndex].id === requesterId) {
      throw new Error('لا يمكن حذف حسابك الحالي أثناء تسجيل الدخول منه');
    }

    this.data.admin_users.splice(adminIndex, 1);
    this.save();
    return true;
  }

  resetAdminUserPassword(id: string, newPassword: string): boolean {
    const admin = this.data.admin_users.find((u) => u.id === id);
    if (!admin) throw new Error('المستخدم غير موجود');

    const salt = bcrypt.genSaltSync(10);
    admin.password_hash = bcrypt.hashSync(newPassword, salt);
    this.save();
    return true;
  }

  updateAdminPassword(id: string, newPassword: string): boolean {
    const admin = this.data.admin_users.find((u) => u.id === id);
    if (!admin) throw new Error('المستخدم غير موجود');

    const salt = bcrypt.genSaltSync(10);
    admin.password_hash = bcrypt.hashSync(newPassword, salt);
    this.save();
    return true;
  }

  // --- Settings ---
  getSettings(): SystemSettings {
    return { ...this.data.settings };
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
    };
    this.save();
    return { ...this.data.settings };
  }

  // --- Full Database Backup & Migration ---
  exportFullDatabase() {
    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      students: this.data.students,
      subjects: this.data.subjects,
      results: this.data.results,
      settings: this.data.settings,
    };
  }

  importFullDatabase(importedData: {
    students?: Student[];
    subjects?: Subject[];
    results?: Result[];
    settings?: Partial<SystemSettings>;
  }) {
    if (Array.isArray(importedData.students)) {
      this.data.students = importedData.students;
    }
    if (Array.isArray(importedData.subjects)) {
      this.data.subjects = importedData.subjects;
    }
    if (Array.isArray(importedData.results)) {
      this.data.results = importedData.results;
    }
    if (importedData.settings) {
      this.data.settings = {
        ...this.data.settings,
        ...importedData.settings,
      };
    }
    this.save();
    return {
      students_count: this.data.students.length,
      subjects_count: this.data.subjects.length,
      results_count: this.data.results.length,
    };
  }

  // --- Summary & Analytics ---
  getDashboardStats() {
    const students = this.getStudents();
    const subjects = this.getSubjects();
    const results = this.getResults();

    // Calculate detailed stats per student
    let totalScoresSum = 0;
    let totalMaxScoresSum = 0;
    let studentsWithResultsCount = 0;
    let passedStudentsCount = 0;

    const studentCalculations = students.map((std) => {
      const stdResults = results.filter((r) => r.student_id === std.id);
      if (stdResults.length > 0) {
        studentsWithResultsCount++;
      }

      let stdTotal = 0;
      let stdMax = 0;
      let stdPassedSubs = 0;

      subjects.forEach((sub) => {
        const r = stdResults.find((res) => res.subject_id === sub.id);
        const score = r ? r.score : 0;
        stdTotal += score;
        stdMax += sub.max_score;
        if (score >= sub.min_pass_score) stdPassedSubs++;
      });

      const percentage = stdMax > 0 ? (stdTotal / stdMax) * 100 : 0;
      const isPassed = percentage >= 50 && stdPassedSubs === subjects.length;
      if (isPassed) passedStudentsCount++;

      totalScoresSum += stdTotal;
      totalMaxScoresSum += stdMax;

      return {
        student: std,
        total_score: stdTotal,
        max_possible_score: stdMax,
        percentage: Number(percentage.toFixed(1)),
        overall_grade: calculateGradeText(percentage),
        is_passed: isPassed,
        results_count: stdResults.length,
      };
    });

    const averagePercentage = totalMaxScoresSum > 0 ? Number(((totalScoresSum / totalMaxScoresSum) * 100).toFixed(1)) : 0;
    const passRate = students.length > 0 ? Number(((passedStudentsCount / students.length) * 100).toFixed(1)) : 0;

    // Top students (Top 5)
    const topStudents = [...studentCalculations]
      .filter((s) => s.results_count > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Groups breakdown
    const groupMap: Record<string, number> = {};
    students.forEach((s) => {
      const g = s.group || 'غير محدد';
      groupMap[g] = (groupMap[g] || 0) + 1;
    });

    return {
      total_students: students.length,
      total_subjects: subjects.length,
      total_results_entries: results.length,
      students_with_results: studentsWithResultsCount,
      passed_students_count: passedStudentsCount,
      pass_rate: passRate,
      average_percentage: averagePercentage,
      top_students: topStudents,
      groups: Object.entries(groupMap).map(([name, count]) => ({ name, count })),
      settings: this.getSettings(),
    };
  }
}

export const db = new Database();
