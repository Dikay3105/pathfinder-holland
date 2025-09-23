import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  FileText, 
  Settings,
  BarChart3
} from 'lucide-react';

const AdminDashboard = () => {
  const adminMenuItems = [
    {
      title: 'Quản lý Khối thi',
      description: 'CRUD khối thi và môn học',
      icon: BookOpen,
      link: '/admin/exam-blocks',
      color: 'bg-blue-500'
    },
    {
      title: 'Quản lý Câu hỏi Holland',
      description: 'CRUD câu hỏi cho từng nhóm Holland',
      icon: Settings,
      link: '/admin/holland-questions',
      color: 'bg-green-500'
    },
    {
      title: 'Quản lý Ngành học',
      description: 'CRUD ngành học, khối thi, Holland types',
      icon: GraduationCap,
      link: '/admin/majors',
      color: 'bg-purple-500'
    },
    {
      title: 'Kết quả Học sinh',
      description: 'Xem và tìm kiếm kết quả bài test',
      icon: BarChart3,
      link: '/admin/student-results',
      color: 'bg-orange-500'
    },
    {
      title: 'Báo cáo PDF',
      description: 'Xuất và quản lý báo cáo PDF',
      icon: FileText,
      link: '/admin/reports',
      color: 'bg-red-500'
    }
  ];

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
                    <Button className="w-full">
                      Truy cập
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Thống kê nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tổng Khối thi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">9</div>
                <p className="text-xs text-muted-foreground">khối thi hiện có</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Câu hỏi Holland
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">60</div>
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
                <div className="text-2xl font-bold">30</div>
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
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">học sinh tham gia</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;