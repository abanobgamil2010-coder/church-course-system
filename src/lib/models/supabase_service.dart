class Student {
      final String id;
        final String studentCode;
          final String fullName;
            final String? phone;
              final String churchName;

                Student({
                    required this.id,
                        required this.studentCode,
                            required this.fullName,
                                this.phone,
                                    required this.churchName,
                                      });

                                        factory Student.fromJson(Map<String, dynamic> json) {
                                            return Student(
                                                  id: json['id'],
                                                        studentCode: json['student_code'],
                                                              fullName: json['full_name'],
                                                                    phone: json['phone'],
                                                                          churchName: json['church_name'] ?? 'كنيسة أفا ماركوس',
                                                                              );
                                                                                }

                                                                                  Map<String, dynamic> toJson() {
                                                                                      return {
                                                                                            'student_code': studentCode,
                                                                                                  'full_name': fullName,
                                                                                                        'phone': phone,
                                                                                                              'church_name': churchName,
                                                                                                                  };
                                                                                                                    }
                                                                                                                    }
}