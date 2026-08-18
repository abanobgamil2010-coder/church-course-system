import 'package:flutter/material.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({Key? key}) : super(key: key);

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF2C251E),
        title: const Row(
          children: [
            Icon(Icons.shield, color: Color(0xFFFFD54F)),
            SizedBox(width: 8),
            Text('لوحة تحكم أمانة الخدمة', style: TextStyle(color: Colors.white, fontSize: 18)),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.cloud_upload, color: Colors.white, size: 18),
            label: const Text('اعتماد ونشر النتيجة', style: TextStyle(color: Colors.white)),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFFFFD54F),
          labelColor: const Color(0xFFFFD54F),
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'نظرة عامة'),
            Tab(icon: Icon(Icons.people), text: 'الطلاب'),
            Tab(icon: Icon(Icons.edit_note), text: 'رصد الدرجات'),
            Tab(icon: Icon(Icons.book), text: 'المواد'),
            Tab(icon: Icon(Icons.print), text: 'التقارير والكشوفات'),
            Tab(icon: Icon(Icons.manage_accounts), text: 'حسابات الخدام'),
            Tab(icon: Icon(Icons.settings), text: 'الإعدادات'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          const Center(child: Text('جدول إدارة الطلاب')),
          const Center(child: Text('شاشة رصد الدرجات')),
          _buildSubjectsTab(),
          const Center(child: Text('الكشوفات والتقارير PDF')),
          const Center(child: Text('إدارة حسابات الخدام')),
          const Center(child: Text('إعدادات الدورة الكنسية')),
        ],
      ),
    );
  }

  // 1. تبويب النظرة العامة
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // كروت الإحصائيات
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.6,
            children: [
              _buildStatCard('إجمالي طلاب الدورة', '0', Icons.groups, Colors.blue),
              _buildStatCard('النتائج المرصودة', '0 / 0', Icons.assignment_turned_in, Colors.orange),
              _buildStatCard('متوسط النسبة العامة', '0%', Icons.trending_up, Colors.purple),
              _buildStatCard('نسبة النجاح والتأهيل', '0%', Icons.verified, Colors.green),
            ],
          ),
          const SizedBox(height: 25),

          // إجراءات سريعة
          const Text('إجراءات سريعة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.person_add, color: Color(0xFF4A3B32)),
                  title: const Text('إضافة طالب جديد'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () => _showAddStudentDialog(context),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.library_add, color: Color(0xFF4A3B32)),
                  title: const Text('إضافة مادة دراسية جديدة'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () => _showAddSubjectDialog(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 2. تبويب المواد الدراسية
  Widget _buildSubjectsTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4A3B32)),
            onPressed: () => _showAddSubjectDialog(context),
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('إضافة مادة جديدة', style: TextStyle(color: Colors.white)),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              children: [
                _buildSubjectItem('كتاب مقدس', 100, 50),
                _buildSubjectItem('تاريخ كنيسة', 100, 50),
                _buildSubjectItem('طقس كنيسة', 100, 50),
                _buildSubjectItem('العقيدة', 100, 50),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 5),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildSubjectItem(String name, int max, int pass) {
    return Card(
      child: ListTile(
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('الدرجة العظمى: $max | حد النجاح: $pass'),
        trailing: const Icon(Icons.edit, color: Colors.grey),
      ),
    );
  }

  // النافذة المنبثقة لـ إضافة مادة جديدة (مطابقة للصورة)
  void _showAddSubjectDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إضافة مادة دراسية جديدة', textAlign: TextAlign.right),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TextField(
              textAlign: TextAlign.right,
              decoration: InputDecoration(labelText: 'اسم المادة (مثال: العقيدة واللاهوت)'),
            ),
            const SizedBox(height: 10),
            const Row(
              children: [
                Expanded(
                  child: TextField(
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(labelText: 'حد النجاح (الصغرى)'),
                  ),
                ),
                SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(labelText: 'الدرجة العظمى'),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4A3B32)),
            onPressed: () => Navigator.pop(context),
            child: const Text('إضافة المادة', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showAddStudentDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إضافة طالب جديد', textAlign: TextAlign.right),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TextField(
              textAlign: TextAlign.right,
              decoration: InputDecoration(labelText: 'اسم الطالب رباعي'),
            ),
            const SizedBox(height: 10),
            const TextField(
              textAlign: TextAlign.right,
              decoration: InputDecoration(labelText: 'كود الطالب / الرقم القومي'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4A3B32)),
            onPressed: () => Navigator.pop(context),
            child: const Text('حفظ الطالب', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}