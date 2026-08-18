import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/student_search_screen.dart';
import 'screens/admin_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
    
      // تهيئة الاتصال بـ Supabase
        await Supabase.initialize(
            url: 'https://tepgwxapzoqtgykpwmit.supabase.co', // ضع هنا رابط مشروعك من Supabase
                anonKey: 'sb_publishable_a4HAs2-z84iUf2WF-zB0xw_JDYsq3xF', // ضع هنا مفتاح anon Key
                  );

                    runApp(const MyApp());
                    }

                    class MyApp extends StatelessWidget {
                      const MyApp({Key? key}) : super(key: key);

                        @override
                          Widget build(BuildContext context) {
                              return MaterialApp(
                                    title: 'مدرسة إعداد الخدام',
                                          debugShowCheckedModeBanner: false,
                                                theme: ThemeData(
                                                        fontFamily: 'Segoe UI',
                                                                primaryColor: const Color(0xFF2C251E),
                                                                      ),
                                                                            home: const StudentSearchScreen(), 
                                                                                );
                                                                                  }
                                                                                  }