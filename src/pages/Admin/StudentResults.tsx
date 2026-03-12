import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import 'react-confirm-alert/src/react-confirm-alert.css';
import { confirmAlert } from 'react-confirm-alert';
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
import * as XLSX from 'xlsx';
import { cursorTo } from 'readline';



const StudentResults = () => {
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showHiddenResult, setShowHiddenResult] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<Number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<'pdf' | 'excel'>('pdf');

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
    schoolYear: '',
    page: 1,
    limit: 5
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // setLoading(true);
      fetchResults();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách kết quả',
        variant: 'destructive'
      });
    } finally {
      // setTimeout(() => {
      //   setLoading(false);
      // }, 500);
    }
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await adminApiService.getClasses(); // giả sử API trả về string[]
        setClasses(res);
      } catch (error) {
        toast({ title: 'Lỗi', description: 'Không lấy được danh sách lớp', variant: 'destructive' });
      }
    };
    fetchClasses();
  }, []);

  const handleOpenDetail = (student: any) => {
    setSelectedStudent(student);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setSelectedStudent(null);
  };

  const handleDownload = () => {
    if (!selectedClass || selectedSchoolYear === 0) return toast({ title: 'Lỗi', description: 'Chưa chọn đủ thông tin', variant: 'destructive' });

    setDialogOpen(false);

    if (downloadType === 'pdf') {
      // console.log('Download PDF for class', selectedClass, 'school year', selectedSchoolYear);
      downloadPDFByClass(selectedClass, selectedSchoolYear);
    } else {
      downloadExcelByClass(selectedClass, selectedSchoolYear);
    }
  };

  const handleDelete = (studentId: string) => {
    confirmAlert({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa học sinh này?',
      buttons: [
        {
          label: 'Có',
          onClick: async () => {
            try {
              // gọi API xóa
              await adminApiService.deleteStudent(studentId);

              // cập nhật state để bảng refresh
              setResults(prev => prev.filter(r => r._id !== studentId));
              toast({
                title: 'Thành công',
                description: 'Đã xóa học sinh',
                variant: 'default'
              });
            } catch (err) {
              console.error(err);
              alert('Xóa thất bại');
            }
          }
        },
        {
          label: 'Hủy',
          onClick: () => { }
        }
      ]
    });
  };

  const fetchResults = async (page: number = 1) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSearch = async (pageNum: number) => {
    try {
      setResults([]); // xóa kết quả cũ
      setSearchLoading(true);
      setIsSearching(true);

      // tạo object mới với page mới
      const filters = { ...searchFilters, page: pageNum, limit: 5 };
      if (filters.schoolYear === 0) {
        delete filters.schoolYear; // xóa trường schoolYear nếu là 0 để tìm tất cả
      }
      console.log(filters);

      const response = await adminApiService.searchStudentResults(filters);

      setResults(response.results);
      if (response.results.length === 0) {
        setPagination({
          total: 0,
          page: 0,
          totalPages: 0,
        });
        return;
      }
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
      setIsSearching(false);
    }
  };

  // Helper function (có thể đặt trong utils hoặc component)
  const getCurrentSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-11 -> 1-12

    if (month >= 8) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  };

  const currentYear = getCurrentSchoolYear();

  // --- Tải PDF theo lớp ---
  const downloadPDFByClass = async (className?: string, schoolYear?: number) => {
    if (!className) return toast({ title: 'Lỗi', description: 'Chưa chọn lớp', variant: 'destructive' });

    try {
      toast({ title: 'Đang tạo PDF', description: 'Vui lòng chờ…', variant: 'default' });

      // gọi API chỉ lấy học sinh lớp đó
      const response = await adminApiService.searchStudentResults({
        ...searchFilters,
        studentClass: className,
        schoolYear: schoolYear ? Number(schoolYear) : 0,
        page: 1,
        limit: 100000, // lấy tất cả
      });

      const students = response.results;
      if (!students.length) return toast({ title: 'Thông báo', description: 'Không có học sinh', variant: 'default' });

      const zip = new JSZip();

      for (const student of students) {
        await new Promise<void>((resolve) => {
          setSelectedId(student._id);

          setTimeout(async () => {
            if (pdfRef.current) {
              const blob: Blob = await html2pdf()
                .from(pdfRef.current)
                .set({
                  margin: [0.5, 0, 0.3, 0],
                  filename: `KetQua_${student.name}_${student.class}_${student.number}.pdf`,
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
                })
                .outputPdf("blob");

              zip.file(`KetQua_${student.name}_${student.class}_${student.number}.pdf`, blob);
            }
            resolve();
          }, 0);
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `KetQua_Lop_${className}.zip`);

      toast({ title: 'Hoàn tất', description: 'Đã tải file zip', variant: 'default' });
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể tải file', variant: 'destructive' });
    }
  };

  // --- Tải Excel theo lớp ---
  const downloadExcelByClass = async (className?: string, schoolYear?: number) => {
    if (!className)
      return toast({ title: 'Lỗi', description: 'Chưa chọn lớp', variant: 'destructive' });

    try {
      toast({ title: 'Đang tạo Excel', description: 'Vui lòng chờ…', variant: 'default' });

      const response = await adminApiService.searchStudentResults({
        studentName: '',
        studentNumber: '',
        dateFrom: '',
        dateTo: '',
        studentClass: className,
        schoolYear: schoolYear ? Number(schoolYear) : 0,
        page: 1,
        limit: 100000,
      });

      const students = response.results;
      if (!students.length)
        return toast({ title: 'Thông báo', description: 'Không có học sinh', variant: 'default' });

      // --- Tạo dữ liệu cho Excel ---
      const wsData = [
        [
          'STT', 'Họ và tên', 'Lớp', 'Số báo danh',
          'Điểm các môn', 'Điểm Holland', 'Khối thi', 'Ngành học mong muốn', 'Trường'
        ]
      ];

      students.forEach((s, idx) => {
        // --- Điểm các môn ---
        const scoresText = s.scores
          ?.map(sc => `${sc.subject}: ${sc.currentScore} (Mục tiêu: ${sc.targetScore})`)
          .join('\n');

        // --- Top Holland theo logic BE ---
        const sorted = Object.entries(s.hollandScores || {})
          .map(([k, v]) => [k as keyof HollandScores, Number(v)])
          .sort((a, b) => b[1] - a[1]);

        const buckets: { score: number; types: string[] }[] = [];
        for (let i = 0; i < sorted.length;) {
          const score = sorted[i][1];
          const types: string[] = [];
          while (i < sorted.length && sorted[i][1] === score) {
            types.push(sorted[i][0]);
            i++;
          }
          buckets.push({ score, types });
        }

        let topGroups: { type: keyof HollandScores; score: number }[] = [];
        if (buckets.length > 0) {
          const maxBucket = buckets[0];
          if (
            maxBucket.types.length >= 4 ||
            (buckets.length === 1 && maxBucket.types.length === 6)
          ) {
            topGroups = [];
          } else {
            const included: { type: keyof HollandScores; score: number }[] = [];
            for (const b of buckets) {
              if (included.length + b.types.length <= 3) {
                b.types.forEach(t =>
                  included.push({ type: t as keyof HollandScores, score: b.score })
                );
              } else break;
            }
            topGroups = included;
          }
        }

        const hollandText = topGroups.map(g => `${g.type}: ${g.score}`).join(', '); // xuống dòng trong ô

        // --- Khối thi ---
        const blocksText = s.selectedBlocks?.join(', ');

        wsData.push([
          idx + 1,
          s.name,
          s.class,
          s.number,
          scoresText,
          hollandText,
          blocksText,
          s.major,
          s.university
        ]);
      });


      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Tự động tính chiều rộng cột
      const colWidths = wsData[0].map((_, colIndex) => {
        const maxLength = wsData.reduce((max, row) => {
          const cell = row[colIndex];
          return Math.max(max, cell ? cell.toString().length : 10);
        }, 10);
        return { wch: maxLength + 2 };
      });
      ws['!cols'] = colWidths;

      // Bật wrap text cho tất cả ô
      Object.keys(ws).forEach((key) => {
        if (key.startsWith('!')) return;
        if (!ws[key].s) ws[key].s = {};
        if (!ws[key].s.alignment) ws[key].s.alignment = {};
        ws[key].s.alignment.wrapText = true;
      });

      XLSX.utils.book_append_sheet(wb, ws, `Lop_${className}`);
      XLSX.writeFile(wb, `KetQua_Lop_${className}.xlsx`);

      toast({ title: 'Hoàn tất', description: 'Đã tải Excel', variant: 'default' });
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể tải file Excel', variant: 'destructive' });
    }
  };





  // const handleDownloadPDF = (studentResult: StudentResult) => {
  //   navigate('/admin/student-results/' + studentResult._id + '?autoExport=true', { state: { student: studentResult } });
  // };
  const handleDownloadPDF = (student: any) => {
    // Render trước -> đợi fetch xong rồi export
    setSelectedId(student._id);
    setTimeout(() => {
      if (pdfRef.current) {
        html2pdf()
          .from(pdfRef.current)
          .set({
            margin: [0.5, 0, 0.3, 0],
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
                  margin: [0.5, 0, 0.3, 0],
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
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

              {/* 🆕 Niên khóa */}


              <div>
                <Label htmlFor="schoolYear">Niên khóa</Label>
                <select
                  id="schoolYear"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchFilters.schoolYear ?? ""}
                  onChange={(e) => {
                    setSearchFilters((prev) => ({
                      ...prev,
                      schoolYear: e.target.value,
                    }));
                  }}
                >
                  <option value="">Tất cả niên khóa</option>

                  {/* Bắt đầu từ 2025-2026 và kéo dài 10 năm sau (có thể tăng/giảm length) */}
                  {Array.from({ length: 11 }).map((_, i) => {
                    const startYear = 2025 + i;
                    const endYear = startYear + 1;
                    const yearString = `${startYear}-${endYear}`;

                    // Tính niên khóa hiện tại để highlight (giống backend)
                    const now = new Date();
                    const currentYearNum = now.getFullYear();
                    const currentMonth = now.getMonth() + 1;
                    const currentSchoolYear = currentMonth >= 8
                      ? `${currentYearNum}-${currentYearNum + 1}`
                      : `${currentYearNum - 1}-${currentYearNum}`;

                    return (
                      <option
                        key={yearString}
                        value={yearString}
                        className={yearString === currentSchoolYear ? "font-semibold text-blue-600" : ""}
                      >
                        {yearString} {yearString === currentSchoolYear ? "(Hiện tại)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Tìm kiếm */}
              <Button
                className="flex-1 min-w-[120px]"
                onClick={() => handleSearch(1)}
                disabled={searchLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
              </Button>

              {/* Xóa bộ lọc */}
              <Button
                className="flex-1 min-w-[120px]"
                variant="outline"
                onClick={() => {
                  setSearchFilters({
                    studentName: '',
                    studentClass: '',
                    studentNumber: '',
                    dateFrom: '',
                    dateTo: '',
                    schoolYear: 0,
                    page: 1,
                    limit: 10
                  });
                  setIsSearching(false);
                  fetchResults();
                }}
              >
                Refresh
              </Button>

              {/* Tải Excel */}
              <Button
                className="flex-1 min-w-[120px] bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                onClick={() => { setDownloadType('excel'); setDialogOpen(true); }}
              >
                Tải Excel theo lớp
              </Button>

              {/* Tải PDF */}
              <Button
                className="flex-1 min-w-[120px] bg-purple-500 hover:bg-purple-600 text-white shadow-md"
                onClick={() => { setDownloadType('pdf'); setDialogOpen(true); }}
              >
                Tải PDF theo lớp
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
            <Table className="table-auto text-center">
              <TableHeader>
                <TableRow>
                  <TableHead className='text-center'>Học sinh</TableHead>
                  <TableHead className='text-center'>Lớp</TableHead>
                  <TableHead className='text-center'>SBD</TableHead>
                  <TableHead className='text-center'>Ngày test</TableHead>
                  <TableHead className='text-center'>Top Holland</TableHead>
                  <TableHead className='text-center'>Ngành đề xuất</TableHead>
                  <TableHead className='text-center'>Tools</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const topTypes = Object.entries(result.hollandScores).map(([type, score]) => ({
                    type,
                    score,
                  }));

                  return (
                    <TableRow key={result._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium max-w-[200px] truncate">{result.name}</TableCell>
                      <TableCell className="max-w-[100px] truncate">{result.class}</TableCell>
                      <TableCell>{result.number}</TableCell>
                      <TableCell className="flex items-center justify-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(result.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-center gap-1">
                          {topTypes.map(({ type, score }) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {score}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-wrap justify-center gap-1">
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
                      <TableCell className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(result)}
                          title="Xuất PDF"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(result)}
                          title="Xem chi tiết"
                        >
                          Xem
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(result._id)}
                          title="Xóa học sinh"
                        >
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {isSearching ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Đang tìm kết quả...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Không có kết quả nào</p>
              </div>
            ) : null}

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
                <p><strong>Niên khóa: </strong>
                  {selectedStudent.schoolYear
                    ? `${selectedStudent.schoolYear}`
                    : ""}
                </p>

                <p><strong>Ngày test:</strong> {formatDateTime(selectedStudent.createdAt)}</p>
                {selectedStudent.selectedBlocks && selectedStudent.selectedBlocks.length > 0 && (
                  <div>
                    <strong>Khối đã chọn:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedStudent.selectedBlocks.map((block: string) => (
                        <Badge key={block} variant="outline" className="text-xs">
                          {block}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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

        {/* Dialog chọn lớp và niên khóa */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Chọn lớp và niên khóa để tải {downloadType === 'pdf' ? 'PDF' : 'Excel'}
              </DialogTitle>
              <DialogDescription>
                Vui lòng chọn lớp và niên khóa bạn muốn tải kết quả.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Chọn lớp */}
              <Label>Lớp</Label>
              <select
                className="w-full border rounded px-2 py-1 mb-2"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Chọn lớp</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {/* Chọn niên khóa */}
              <Label>Niên khóa</Label>
              <select
                className="w-full border rounded px-2 py-1"
                value={selectedSchoolYear ?? ""}
                onChange={(e) => setSelectedSchoolYear(e.target.value === "" ? 0 : Number(e.target.value))}
              >
                <option value={0}>Chọn niên khóa</option>
                {[2025, 2026, 2027, 2028, 2029].map((year) => (
                  <option key={year} value={year}>
                    {year} - {year + 1}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleDownload}>Tải</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="ghost"
            disabled={pagination.page === 1 || pagination.page === 0}
            onClick={() => {
              isSearching ? handleSearch(1) : fetchResults(1);
            }}
            className='no-border'
          >
            « Đầu
          </Button>

          <Button
            variant="ghost"
            disabled={pagination.page === 1 || pagination.page === 0}
            onClick={() => {
              if (pagination.page > 1) {
                isSearching ? handleSearch(pagination.page - 1) : fetchResults(pagination.page - 1);
              }
            }}
          >
            ‹ Trước
          </Button>

          <span className="px-3 font-medium">
            Trang {pagination.page}/{pagination.totalPages}
          </span>

          <Button
            variant="ghost"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => {
              if (pagination.page < pagination.totalPages) {
                isSearching ? handleSearch(pagination.page + 1) : fetchResults(pagination.page + 1);
              }
            }}
          >
            Sau ›
          </Button>

          <Button
            variant="ghost"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => {
              isSearching ? handleSearch(pagination.totalPages) : fetchResults(pagination.totalPages);
            }}
          >
            Cuối »
          </Button>
        </div>



      </main>

      <div style={{ display: 'none' }}>
        <ResultPDF ref={pdfRef} studentId={selectedId} />
      </div>

    </div>
  );
};

export default StudentResults;