import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  Search,
  FileText,
  Download,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react';
import { adminApiService, StudentResult, SearchFilters } from '@/services/adminApi';
import { useToast } from '@/hooks/use-toast';

const StudentResults = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    studentName: '',
    studentClass: '',
    studentNumber: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await adminApiService.getStudentResults();
      setResults(data);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách kết quả',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setSearchLoading(true);
      const response = await adminApiService.searchStudentResults(searchFilters);
      setResults(response.results);
      setPagination({
        total: response.total,
        page: response.page,
        totalPages: response.totalPages
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tìm kiếm kết quả',
        variant: 'destructive'
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDownloadPDF = async (studentResult: StudentResult) => {
    try {
      const pdfUrl = await adminApiService.getStudentResultPDF(studentResult._id);

      // Mock PDF download - replace with actual implementation
      toast({
        title: 'Tải PDF',
        description: `Đang tải PDF kết quả của ${studentResult.studentName}`
      });

      // In real implementation, you would:
      // const link = document.createElement('a');
      // link.href = pdfUrl;
      // link.download = `ket-qua-${studentResult.studentNumber}-${studentResult.studentName}.pdf`;
      // link.click();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải PDF',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getTopHollandTypes = (scores: any) => {
    return Object.entries(scores)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type, score]) => ({ type, score }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Quay lại
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Kết quả Học sinh</h1>
                <p className="text-muted-foreground">Xem và tải PDF kết quả bài test Holland</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Tìm kiếm kết quả</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              <div>
                <Label htmlFor="studentName">Tên học sinh</Label>
                <Input
                  id="studentName"
                  value={searchFilters.studentName}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder="Nhập tên học sinh"
                />
              </div>
              <div>
                <Label htmlFor="studentClass">Lớp</Label>
                <Input
                  id="studentClass"
                  value={searchFilters.studentClass}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, studentClass: e.target.value }))}
                  placeholder="VD: 12A1"
                />
              </div>
              <div>
                <Label htmlFor="studentNumber">Số báo danh</Label>
                <Input
                  id="studentNumber"
                  value={searchFilters.studentNumber}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, studentNumber: e.target.value }))}
                  placeholder="VD: 1, 2, 3,..."
                />
              </div>
              <div>
                <Label htmlFor="dateFrom">Từ ngày</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={searchFilters.dateFrom}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">Đến ngày</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={searchFilters.dateTo}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSearch} disabled={searchLoading}>
                <Search className="mr-2 h-4 w-4" />
                {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchFilters({
                    studentName: '',
                    studentClass: '',
                    studentNumber: '',
                    dateFrom: '',
                    dateTo: '',
                    page: 1,
                    limit: 10
                  });
                  fetchResults();
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Danh sách kết quả ({results.length})</span>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{pagination.total || results.length} tổng cộng</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học sinh</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>SBD</TableHead>
                  <TableHead>Ngày test</TableHead>
                  <TableHead>Top Holland</TableHead>
                  <TableHead>Ngành đề xuất</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const topTypes = Object.entries(result.hollandScores).map(([type, score]) => ({
                    type,
                    score,
                  })); return (
                    <TableRow key={result._id}>
                      <TableCell className="font-medium">{result.name}</TableCell>
                      <TableCell>{result.class}</TableCell>
                      <TableCell>{result.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(result.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {topTypes.map(({ type, score }) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {score as number}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          {result.recommendedMajors.slice(0, 2).map((major) => (
                            <Badge key={major._id} variant="secondary" className="text-xs">
                              {major.name}
                            </Badge>
                          ))}
                          {result.recommendedMajors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.recommendedMajors.length - 2} khác
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(result)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {results.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Không có kết quả nào</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentResults;