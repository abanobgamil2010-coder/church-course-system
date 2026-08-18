import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../models/student_model.dart';

class StudentSearchScreen extends StatefulWidget {
  const StudentSearchScreen({Key? key}) : super(key: key);

  @override
  State<StudentSearchScreen> createState() => _StudentSearchScreenState();
}

class _StudentSearchScreenState extends State<StudentSearchScreen> {
  final TextEditingController _codeController = TextEditingController();
  final SupabaseService _supabaseService = SupabaseService();
  bool _isLoading = false;
  Student? _studentResult;
  List<Map<String, dynamic>> _gradesList = [];
  String? _errorMessage;

  void _searchResult() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _studentResult = null;
      _gradesList = [];
    });

    try {
      final student = await _supabaseService.getStudentByCode(code);
      if (student != null) {
        final grades = await _supabaseService.getStudentGrades(student.id);
        setState(() {
          _studentResult = student;
          _gradesList = grades;
        });
      } else {
        setState(() {
          _errorMessage = 'عذراً، لم يتم العثور على طالب بهذا الكود.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'حدث خطأ أثناء جلب البيانات: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F5F7),
      appBar: AppBar(
        backgroundColor: const Color(0xFF2C251E),
        title: const Text(
          'مدرسة إعداد الخدام أفا ماركوس',
          style: TextStyle(color: Colors.white, fontSize: 18),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // شريط التنويه العلوي
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFFE082)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Color(0xFFF57F17)),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'تنويه هام من أمانة الخدمة: تهنئ أمانة الخدمة جميع الإخوة والأخوات بنجاح الدورة، مع تمنياتنا بدوام النمو.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5D4037)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 25),

            // عنوان الواجهة والآية
            Column(
              children: [
                Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF8D6E63), width: 2),
                  ),
                  child: const Icon(Icons.church, size: 40, color: Color(0xFF5D4037)),
                ),
                const SizedBox(height: 10),
                const Text(
                  'البوابة الرسمية للنتائج',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 5),
                const Text(
                  'نتيجة إعداد خدام',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2C251E),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '«اللَّهُمَّ قَدْ عَلَّمْتَنِي مُنْذُ صِبَايَ، وَإِلَى هذِهِ السَّاعَةِ أُخْبِرُ بِعَجَائِبِكَ» (مز 71 : 17)',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Color(0xFF795548), fontStyle: FontStyle.italic),
                ),
              ],
            ),
            const SizedBox(height: 30),

            // كارت البحث
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'الاستعلام عن النتيجة',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'أدخل كود الطالب للحصول على النتيجة التفصيلية والتقديرات.',
                      style: TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                    const SizedBox(height: 15),
                    TextField(
                      controller: _codeController,
                      textAlign: TextAlign.right,
                      decoration: InputDecoration(
                        hintText: '... أدخل كود الطالب',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 15),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4A3B32),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _isLoading ? null : _searchResult,
                        icon: const Icon(Icons.search, color: Colors.white),
                        label: _isLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('بحث عن النتيجة', style: TextStyle(color: Colors.white, fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // عرض نتيجة البحث
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.red.shade50,
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
              ),

            if (_studentResult != null)
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Text('الاسم: ${_studentResult!.fullName}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text('الكود: ${_studentResult!.studentCode}'),
                      const Divider(),
                      const Text('الدرجات:', style: TextStyle(fontWeight: FontWeight.bold)),
                      ..._gradesList.map((g) => ListTile(
                            title: Text(g['subjects']['name'] ?? 'مادة'),
                            trailing: Text('${g['score']} / ${g['subjects']['max_score']}'),
                          )),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}