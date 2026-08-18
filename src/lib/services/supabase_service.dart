import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/student_model.dart';

class SupabaseService {
  final SupabaseClient client = Supabase.instance.client;

    // إضافة طالب جديد
      Future<void> addStudent(Student student) async {
          await client.from('students').insert(student.toJson());
            }

              // الاستعلام عن طالب بواسطة الكود
                Future<Student?> getStudentByCode(String code) async {
                    final response = await client
                            .from('students')
                                    .select()
                                            .eq('student_code', code)
                                                    .maybeSingle();

                                                        if (response == null) return null;
                                                            return Student.fromJson(response);
                                                              }

                                                                // جلب نتائج طالب معين مع المواد
                                                                  Future<List<Map<String, dynamic>>> getStudentGrades(String studentId) async {
                                                                      final response = await client
                                                                              .from('grades')
                                                                                      .select('score, subjects(name, max_score, pass_score)')
                                                                                              .eq('student_id', studentId);

                                                                                                  return List<Map<String, dynamic>>.from(response);
                                                                                                    }
                                                                                                    }