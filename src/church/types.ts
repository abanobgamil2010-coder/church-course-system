export interface Student {
  id: string;
  name: string;
  student_code: string;
  group: string; // e.g. "المجموعة الأولى", "دفعة 2025 - المرحلة الأولى"
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  max_score: number;
  min_pass_score: number;
  order: number;
  parent_id?: string | null;
  is_category?: boolean;
}

export interface Result {
  id: string;
  student_id: string;
  subject_id: string;
  score: number;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'super_admin' | 'servant';
  created_at: string;
}

export interface SystemSettings {
  church_name: string;
  course_name: string;
  academic_year: string;
  spiritual_verse: string;
  spiritual_verse_ref: string;
  announcement_text: string;
  show_announcement: boolean;
  is_published: boolean;
  allow_certificate_download: boolean;
  logo_url?: string;
  secondary_logo_url?: string;
}

export interface DatabaseSchema {
  students: Student[];
  subjects: Subject[];
  results: Result[];
  admin_users: AdminUser[];
  settings: SystemSettings;
}

export interface StudentScoreItem {
  subject_id: string;
  subject_name: string;
  parent_subject_id?: string;
  parent_subject_name?: string;
  score: number;
  max_score: number;
  min_pass_score: number;
  percentage: number;
  grade_text: string;
  is_passed: boolean;
}

export interface StudentFullResult {
  student: {
    id: string;
    name: string;
    student_code: string;
    group: string;
  };
  subjects: StudentScoreItem[];
  totals: {
    total_score: number;
    max_possible_score: number;
    percentage: number;
    overall_grade: string;
    is_passed: boolean;
    subjects_count: number;
    passed_subjects_count: number;
  };
  church_info: {
    church_name: string;
    course_name: string;
    academic_year: string;
    spiritual_verse: string;
    spiritual_verse_ref: string;
    logo_url?: string;
    secondary_logo_url?: string;
  };
}
