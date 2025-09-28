import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationPrevious, PaginationNext
} from "@/components/ui/pagination";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // shadcn/ui
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import ResultPDF from './ResultStep';



const StudentResults = () => {
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showHiddenResult, setShowHiddenResult] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);


  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
    limit: 5
  });
  const { toast } = useToast();

  useEffect(() => {
    try {
      setLoading(true);
      fetchResults();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách kết quả',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, []);


  const handleOpenDetail = (student: any) => {
    setSelectedStudent(student);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setSelectedStudent(null);
  };


  const fetchResults = async (page: number = 1) => {
    try {
      // setLoading(true);
      const data = await adminApiService.getStudentResults(page);
      setResults(data.results);
      setPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách kết quả',
        variant: 'destructive'
      });
    } finally {
      // setLoading(false);
    }
  };

  const handleSearch = async (pageNum: number) => {
    try {
      setSearchLoading(true);
      setIsSearching(true);

      // tạo object mới với page mới
      const filters = { ...searchFilters, page: pageNum, limit: 10000000 };
      console.log(filters);

      const response = await adminApiService.searchStudentResults(filters);

      setResults(response.results);
      // console.log(response);
      setPagination({
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
      });

      // lưu lại page vào state filters (để đồng bộ UI nếu cần)
      setSearchFilters(filters);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tìm kiếm kết quả',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // const handleDownloadPDF = (studentResult: StudentResult) => {
  //   navigate('/admin/student-results/' + studentResult._id + '?autoExport=true', { state: { student: studentResult } });
  // };
  const pdfRef = useRef<HTMLDivElement>(null);
  const handleDownloadPDF = (student: any) => {
    // Render trước -> đợi fetch xong rồi export
    setSelectedId(student._id);
    setTimeout(() => {
      if (pdfRef.current) {
        html2pdf()
          .from(pdfRef.current)
          .set({
            margin: [0.5, 0, 0, 0],
            filename: `KetQua_${student.name}_${student.class}_${student.number}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
          })
          .save();
      }
    }, 500)// cho fetch vài giây, hoặc dùng callback khi load xong
  };

  // Giả sử results là mảng StudentResult đã lưu state
  const downloadPDFAll = async () => {
    try {
      toast({
        title: "Đang tạo PDF",
        description: "Vui lòng chờ…",
        variant: "default",
      });

      const zip = new JSZip();

      for (const student of results) {
        await new Promise<void>((resolve) => {
          setSelectedId(student._id);

          setTimeout(async () => {
            if (pdfRef.current) {
              // tạo blob thay vì save
              const blob: Blob = await html2pdf()
                .from(pdfRef.current)
                .set({
                  margin: [0.5, 0, 0, 0],
                  filename: `KetQua_${student.name}_${student.class}_${student.number}.pdf`,
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
                })
                .outputPdf("blob"); // <- lấy blob

              // thêm file vào zip
              zip.file(
                `KetQua_${student.name}_${student.class}_${student.number}.pdf`,
                blob
              );
            }
            resolve();
          }, 0); // thời gian chờ render
        });
      }

      // Tạo zip blob và tải
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "DanhSachKetQua.zip");

      toast({
        title: "Hoàn tất",
        description: "Đã tải file zip",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải file zip",
        variant: "destructive",
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
              <Button onClick={() => handleSearch(1)} disabled={searchLoading}>
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
                  setIsSearching(false);
                  fetchResults();
                }}
              >
                Xóa bộ lọc
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                onClick={() => {
                  downloadPDFAll();
                }}
              >
                Tải toàn bộ kết quả
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
                <span>{pagination.total} tổng cộng</span>
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
                  <TableHead>Tools</TableHead>
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(result)}
                        >
                          Xem chi tiết
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
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thông tin chi tiết</DialogTitle>
              <DialogDescription>
                {selectedStudent?.name} - Lớp {selectedStudent?.class}
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-3 text-sm overflow-y-auto max-h-[70vh]">
                <p><strong>Số báo danh:</strong> {selectedStudent.number}</p>
                <p><strong>Ngày test:</strong> {formatDate(selectedStudent.createdAt)}</p>

                <div>
                  <strong>Điểm Holland:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(selectedStudent.hollandScores).map(([t, s]) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}: {s as number}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <strong>Ngành đề xuất:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedStudent.recommendedMajors.map((m: any) => (
                      <Badge key={m._id} variant="secondary" className="text-xs">
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <strong>Điểm hiện tại / mong muốn:</strong>
                  <ul className="list-disc ml-5 mt-1">
                    {selectedStudent.scores.map((sc: any) => (
                      <li key={sc._id}>
                        {sc.subject}: {sc.currentScore} → {sc.targetScore}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 🆕 Trường mong muốn */}
                {selectedStudent.university && (
                  <p>
                    <strong>Trường mong muốn:</strong> {selectedStudent.university}
                  </p>
                )}

                {/* 🆕 Ngành mong muốn */}
                {selectedStudent.major && (
                  <p>
                    <strong>Ngành mong muốn:</strong> {selectedStudent.major}
                  </p>
                )}
              </div>
            )}

          </DialogContent>
        </Dialog>

        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={(
                  pagination.page === 1 && "pointer-events-none opacity-50"
                )} onClick={() => {
                  if (isSearching) {
                    handleSearch(pagination.page - 1);
                  } else {
                    fetchResults(pagination.page - 1)
                  }
                }}
              />
            </PaginationItem>
            <span className="px-2">Trang {pagination.page}/{pagination.totalPages}</span>
            <PaginationItem>
              <PaginationNext
                onClick={() => {
                  if (isSearching) {
                    handleSearch(pagination.page + 1);
                  } else {
                    fetchResults(pagination.page + 1)
                  }
                }}
                className={(
                  pagination.page === pagination.totalPages && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

      </main>

      <div style={{ display: 'none' }}>
        <ResultPDF ref={pdfRef} studentId={selectedId} />
      </div>

    </div>
  );
};

export default StudentResults;