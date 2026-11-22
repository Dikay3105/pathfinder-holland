import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  BarChart3,
  PieChart,
  School,
  ListChecks,
  BookOpen,
  GraduationCap,
  SlidersHorizontal
} from 'lucide-react';

interface Stats {
  totalQuestions: number;
  totalMajors: number;
  totalStudents: number;
  totalBlocks?: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminMenuItems = [
    {
      title: 'Kết quả Học sinh',
      description: 'Xem và tìm kiếm kết quả bài test',
      icon: BarChart3,
      link: '/admin/student-results',
      color: 'bg-orange-500'
    },
    {
      title: 'Thống kê',
      description: 'Trường, ngành học sinh chọn, nhóm Holland, khối thi',
      icon: PieChart,
      link: '/admin/statistics',
      color: 'bg-blue-600'
    },
    {
      title: 'Trường & ngành mong muốn',
      description: 'Quản lý danh sách học sinh chọn khi làm test',
      icon: School,
      link: '/admin/options',
      color: 'bg-emerald-600'
    },
    {
      title: 'Câu hỏi Holland',
      description: 'Thêm, sửa, xoá câu hỏi trong 6 nhóm R-I-A-S-E-C',
      icon: ListChecks,
      link: '/admin/holland-questions',
      color: 'bg-violet-600'
    },
    {
      title: 'Ngành học',
      description: 'Nhóm Holland, tổ hợp, điểm chuẩn của từng ngành (nhập/xuất Excel)',
      icon: GraduationCap,
      link: '/admin/majors',
      color: 'bg-rose-600'
    },
    {
      title: 'Môn học & tổ hợp',
      description: 'Môn thi bắt buộc, tự chọn, năng khiếu và các tổ hợp xét tuyển',
      icon: BookOpen,
      link: '/admin/exam-blocks',
      color: 'bg-cyan-600'
    },
    {
      title: 'Cấu hình tư vấn',
      description: 'Trọng số xếp hạng ngành, quy tắc nhóm Holland, lời khuyên AI, chạy thử',
      icon: SlidersHorizontal,
      link: '/admin/settings',
      color: 'bg-slate-700'
    }
  ];

  // 🟢 Gọi API khi mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/admin/stats');
        if (!res.ok) throw new Error(`Lỗi: ${res.status}`);
        const data = await res.json();
        setStats(data.data); // { totalQuestions, totalMajors, totalStudents }
      } catch (err) {
        console.error(err);
        setError('Không thể tải thống kê');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Quản lý hệ thống Holland Test</p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Về trang chính
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  <Link to={item.link}>
                    <Button className="w-full">Truy cập</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Thống kê nhanh</h2>

          {loading && <p>Đang tải thống kê...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổ hợp xét tuyển
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBlocks ?? '—'}</div>
                  <p className="text-xs text-muted-foreground">tổ hợp đang dùng</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Câu hỏi Holland
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                  <p className="text-xs text-muted-foreground">câu hỏi tổng cộng</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ngành học
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMajors}</div>
                  <p className="text-xs text-muted-foreground">ngành học</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Học sinh đã test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">học sinh tham gia</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
