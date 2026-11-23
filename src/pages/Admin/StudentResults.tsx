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
  Users,
  Sparkles as SparklesIcon,
  Loader2 as LoaderIcon,
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
import { ResultReport, OFFSCREEN_STYLE, ReportStudent } from '@/components/ResultReport';
import { savePdf, pdfBlob, safeFileName } from '@/lib/pdfExport';
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx';
import { useRealtime } from '@/hooks/useRealtime';
import { formatSchoolYear, getSchoolYear, getSchoolYearOptions } from '@/lib/schoolYear';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const PAGE_SIZE_KEY = 'studentResults.pageSize';

type PageData = { results: StudentResult[]; total: number; page: number; totalPages: number };

const StudentResults = () => {
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showHiddenResult, setShowHiddenResult] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true); // chỉ dùng cho lần tải đầu tiên
  const [pageLoading, setPageLoading] = useState(false); // chuyển trang / tìm kiếm: giữ bảng cũ, chỉ làm mờ
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
      return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
    } catch {
      return 10;
    }
  });
  // Bộ lọc đang áp dụng cho danh sách (null = xem tất cả). Tách khỏi ô nhập để chuyển trang không mất bộ lọc.
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters | null>(null);
  const pageCacheRef = useRef(new Map<string, Promise<PageData>>());
  const requestIdRef = useRef(0);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
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
  // ===== PDF: render bản báo cáo A4 (ResultReport) ngoài màn hình với dữ liệu có sẵn, chờ vẽ xong rồi chụp =====
  const [reportStudent, setReportStudent] = useState<ReportStudent | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    apiService
      .getQuestions()
      .then(qs => {
        const counts: Record<string, number> = {};
        qs.forEach(q => (counts[q.type] = (counts[q.type] || 0) + 1));
        setQuestionCounts(counts);
      })
      .catch(() => { /* không có số câu thì chỉ ghi điểm */ });
  }, []);

  const pdfName = (s: any) => safeFileName('KetQua', s.name, s.class, s.number) + '.pdf';

  /** Render báo cáo của 1 học sinh và trả về element để chụp */
  const renderReport = async (student: any): Promise<HTMLElement | null> => {
    setReportStudent({ ...student });
    await new Promise(r => setTimeout(r, 60));
    return reportRef.current;
  };

  /** Tạo zip PDF cho danh sách học sinh, báo tiến độ */
  const zipReports = async (students: any[], zipName: string) => {
    const zip = new JSZip();
    const progress = toast({ title: 'Đang tạo PDF', description: `0/${students.length} học sinh…` });
    try {
      for (let i = 0; i < students.length; i++) {
        const el = await renderReport(students[i]);
        if (el) zip.file(pdfName(students[i]), await pdfBlob(el, pdfName(students[i])));
        progress.update({ id: progress.id, title: 'Đang tạo PDF', description: `${i + 1}/${students.length} học sinh…` });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, zipName);
      progress.update({ id: progress.id, title: 'Hoàn tất', description: `Đã tải ${students.length} file PDF` });
    } finally {
      setReportStudent(null);
    }
  };

  /* ===== Realtime: học sinh nộp bài xong → hiện ngay trong bảng ===== */
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [pendingNew, setPendingNew] = useState(0);

  const flash = (id: string) => {
    setHighlightIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setHighlightIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 8000);
  };

  const hasActiveFilters = () => appliedFilters !== null;

  const realtimeConnected = useRealtime({
    'student:upserted': ({ created, student }: { created: boolean; student: any }) => {
      if (!student?._id) return;
      pageCacheRef.current.clear(); // dữ liệu đã đổi → bỏ cache các trang
      const exists = results.some(r => r._id === student._id);

      if (exists) {
        setResults(prev => prev.map(r => (r._id === student._id ? student : r)));
      } else if (created && pagination.page <= 1 && !hasActiveFilters()) {
        const limit = pageSize;
        setResults(prev => [student, ...prev].slice(0, limit));
        setPagination(prev => {
          const total = prev.total + 1;
          return { ...prev, page: prev.page || 1, total, totalPages: Math.ceil(total / limit) };
        });
      } else {
        setPendingNew(n => n + 1);
      }

      if (selectedStudent?._id === student._id) setSelectedStudent(student);
      flash(student._id);
      toast({
        title: created ? 'Có kết quả mới' : 'Kết quả được cập nhật',
        description: `${student.name} - lớp ${student.class} vừa hoàn thành bài test`,
      });
    },
    // AI viết xong lời khuyên (chạy nền) → cập nhật dữ liệu, không bật thông báo
    'student:advice': ({ id, advice, adviceStatus }: { id: string; advice: string; adviceStatus: string }) => {
      pageCacheRef.current.clear();
      setResults(prev => prev.map(r => (r._id === id ? ({ ...r, advice, adviceStatus } as any) : r)));
      setSelectedStudent((prev: any) => (prev?._id === id ? { ...prev, advice, adviceStatus } : prev));
    },
    'student:deleted': ({ id }: { id: string }) => {
      pageCacheRef.current.clear();
      if (!results.some(r => r._id === id)) return;
      setResults(prev => prev.filter(r => r._id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(prev.total - 1, 0) }));
    },
  });

  const reloadAfterRealtime = () => {
    setPendingNew(0);
    loadPage(1, { fresh: true });
  };

  useEffect(() => {
    loadPage(1);
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
    if (!selectedClass || !selectedSchoolYear) return toast({ title: 'Lỗi', description: 'Chưa chọn đủ thông tin', variant: 'destructive' });

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
              loadPage(pagination.page || 1, { fresh: true });
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

  /** Lấy 1 trang (có cache theo bộ lọc + số dòng + trang, gộp các request trùng nhau) */
  const requestPage = (filters: SearchFilters | null, page: number, size: number): Promise<PageData> => {
    const key = JSON.stringify([filters, page, size]);
    const cached = pageCacheRef.current.get(key);
    if (cached) return cached;
    const req = filters
      ? adminApiService.searchStudentResults({ ...filters, page, limit: size })
      : adminApiService.getStudentResults(page, size);
    pageCacheRef.current.set(key, req);
    req.catch(() => pageCacheRef.current.delete(key));
    return req;
  };

  /**
   * Hiển thị 1 trang. Không thay bảng bằng màn hình loading (tránh nhảy lên đầu trang):
   * trang đã cache thì hiện ngay, chưa có thì giữ bảng cũ làm mờ đến khi có dữ liệu.
   */
  const loadPage = async (
    page: number,
    opts: { filters?: SearchFilters | null; size?: number; fresh?: boolean } = {}
  ) => {
    const filters = opts.filters !== undefined ? opts.filters : appliedFilters;
    const size = opts.size ?? pageSize;
    if (opts.fresh) pageCacheRef.current.clear();

    const id = ++requestIdRef.current;
    const isCached = pageCacheRef.current.has(JSON.stringify([filters, page, size]));
    if (!isCached) setPageLoading(true);

    try {
      const data = await requestPage(filters, page, size);
      if (id !== requestIdRef.current) return; // đã có yêu cầu mới hơn

      // Trang hiện tại bị trống (vd. vừa xóa dòng cuối của trang cuối) → lùi về trang cuối còn dữ liệu
      if (data.results.length === 0 && data.totalPages > 0 && page > data.totalPages) {
        loadPage(data.totalPages, { filters, size });
        return;
      }

      setResults(data.results);
      setPagination(
        data.results.length === 0
          ? { total: 0, page: 0, totalPages: 0 }
          : { total: data.total, page: data.page, totalPages: data.totalPages }
      );

      // Tải trước trang kế tiếp để bấm "Sau" hiện ngay
      if (data.page < data.totalPages) requestPage(filters, data.page + 1, size).catch(() => { });
    } catch (error) {
      if (id === requestIdRef.current) {
        toast({
          title: 'Lỗi',
          description: filters ? 'Không thể tìm kiếm kết quả' : 'Không thể tải danh sách kết quả',
          variant: 'destructive',
        });
      }
    } finally {
      if (id === requestIdRef.current) {
        setPageLoading(false);
        setLoading(false);
      }
    }
  };

  const handleSearch = () => {
    const { page: _p, limit: _l, ...rest } = searchFilters;
    const filters: SearchFilters = { ...rest };
    if (!filters.schoolYear) delete filters.schoolYear; // để trống = tất cả niên khóa
    setAppliedFilters(filters);
    loadPage(1, { filters, fresh: true });
  };

  const handlePageSizeChange = (size: number) => {
    // Giữ dòng đầu tiên đang xem nằm trong trang mới
    const firstIndex = Math.max((pagination.page || 1) - 1, 0) * pageSize;
    const newPage = Math.floor(firstIndex / size) + 1;
    setPageSize(size);
    try { localStorage.setItem(PAGE_SIZE_KEY, String(size)); } catch { /* bỏ qua */ }
    loadPage(newPage, { size });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    loadPage(page);
  };

  // --- Tải PDF theo lớp ---
  const downloadPDFByClass = async (className?: string, schoolYear?: string) => {
    if (!className) return toast({ title: 'Lỗi', description: 'Chưa chọn lớp', variant: 'destructive' });

    try {
      toast({ title: 'Đang tạo PDF', description: 'Vui lòng chờ…', variant: 'default' });

      // gọi API chỉ lấy học sinh lớp đó
      const response = await adminApiService.searchStudentResults({
        ...searchFilters,
        studentClass: className,
        schoolYear: schoolYear || '',
        page: 1,
        limit: 100000, // lấy tất cả
      });

      const students = response.results;
      if (!students.length) return toast({ title: 'Thông báo', description: 'Không có học sinh', variant: 'default' });

      await zipReports(students, safeFileName('KetQua_Lop', className, schoolYear) + '.zip');
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể tải file', variant: 'destructive' });
    }
  };

  // --- Tải Excel theo lớp ---
  const downloadExcelByClass = async (className?: string, schoolYear?: string) => {
    if (!className)
      return toast({ title: 'Lỗi', description: 'Chưa chọn lớp', variant: 'destructive' });

    try {
      toast({ title: 'Đang tạo Excel', description: 'Vui lòng chờ…', variant: 'default' });

      console.log(schoolYear)

      const response = await adminApiService.searchStudentResults({
        studentName: '',
        studentNumber: '',
        dateFrom: '',
        dateTo: '',
        studentClass: className,
        schoolYear: schoolYear || '',
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
  const handleDownloadPDF = async (student: any) => {
    try {
      const el = await renderReport(student);
      if (el) await savePdf(el, pdfName(student));
    } catch (err) {
      console.error(err);
      toast({ title: 'Lỗi', description: 'Không thể tạo PDF', variant: 'destructive' });
    } finally {
      setReportStudent(null);
    }
  };

  // Giả sử results là mảng StudentResult đã lưu state
  const downloadPDFAll = async () => {
    try {
      toast({
        title: "Đang tạo PDF",
        description: "Vui lòng chờ…",
        variant: "default",
      });

      await zipReports(results, 'DanhSachKetQua.zip');
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
                <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  Kết quả Học sinh
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${realtimeConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-muted bg-muted text-muted-foreground'}`}
                    title={realtimeConnected ? 'Kết quả mới sẽ tự hiện, không cần tải lại trang' : 'Đang kết nối lại máy chủ...'}
                  >
                    <span className={`h-2 w-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                    {realtimeConnected ? 'Trực tiếp' : 'Đang kết nối…'}
                  </span>
                </h1>
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

                  {getSchoolYearOptions().map((yearString) => {
                    const currentSchoolYear = getSchoolYear();
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
                onClick={handleSearch}
                disabled={pageLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                {pageLoading && appliedFilters ? 'Đang tìm...' : 'Tìm kiếm'}
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
                    schoolYear: '',
                    page: 1,
                    limit: pageSize
                  });
                  setAppliedFilters(null);
                  setPendingNew(0);
                  loadPage(1, { filters: null, fresh: true });
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
            {pendingNew > 0 && (
              <button
                type="button"
                onClick={reloadAfterRealtime}
                className="mb-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Có {pendingNew} kết quả mới · Bấm để tải lại danh sách
              </button>
            )}
            <div className="relative">
            {pageLoading && results.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/50 pt-16">
                <LoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <Table className={`table-auto text-center transition-opacity ${pageLoading ? 'opacity-60' : ''}`}>
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
                    <TableRow
                      key={result._id}
                      className={`transition-colors duration-700 ${highlightIds.has(result._id) ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'}`}
                    >
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
            </div>

            {results.length === 0 && (
              <div className="text-center py-8">
                {pageLoading ? (
                  <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                )}
                <p className="text-muted-foreground">{pageLoading ? 'Đang tải kết quả...' : 'Không có kết quả nào'}</p>
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
                <p><strong>Niên khóa: </strong>
                  {formatSchoolYear(selectedStudent.schoolYear)}
                </p>

                <p><strong>Ngày test:</strong> {formatDateTime(selectedStudent.createdAt)}</p>

                {/* Nguồn lời khuyên + tạo lại bằng AI */}
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <strong>Lời khuyên:</strong>
                  {selectedStudent.adviceStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-primary"><LoaderIcon className="h-3.5 w-3.5 animate-spin" /> AI đang viết…</span>
                  ) : selectedStudent.adviceStatus === 'fallback' ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Lời khuyên mẫu (AI chưa dùng được)</span>
                  ) : selectedStudent.advice ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">AI viết</span>
                  ) : (
                    <span className="text-muted-foreground">Chưa có</span>
                  )}
                  {selectedStudent.adviceStatus !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-8"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/students/${selectedStudent._id}/regenerate-advice`, { method: 'POST' });
                          const body = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(body.message || 'Không tạo lại được');
                          setSelectedStudent((prev: any) => (prev ? { ...prev, adviceStatus: 'pending' } : prev));
                          toast({ title: 'Đang tạo lại lời khuyên', description: 'Kết quả sẽ tự cập nhật khi AI viết xong.' });
                        } catch (err) {
                          toast({ title: 'Chưa tạo lại được', description: (err as Error).message, variant: 'destructive' });
                        }
                      }}
                    >
                      <SparklesIcon className="mr-1 h-3.5 w-3.5" /> Tạo lại lời khuyên AI
                    </Button>
                  )}
                </div>
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
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
              >
                <option value="">Chọn niên khóa</option>
                {getSchoolYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
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


        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="pageSize">Hiển thị</label>
            <select
              id="pageSize"
              className="rounded border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              dòng / trang
              {pagination.total > 0 && (
                <> · {(pagination.page - 1) * pageSize + 1}–{Math.min(pagination.page * pageSize, pagination.total)} / {pagination.total}</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(1)}
              className='no-border'
            >
              « Đầu
            </Button>

            <Button
              variant="ghost"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              ‹ Trước
            </Button>

            <span className="px-3 font-medium">
              Trang {pagination.page}/{pagination.totalPages}
            </span>

            <Button
              variant="ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Sau ›
            </Button>

            <Button
              variant="ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.totalPages)}
            >
              Cuối »
            </Button>
          </div>
        </div>



      </main>

      {reportStudent && (
        <div style={OFFSCREEN_STYLE} aria-hidden>
          <ResultReport ref={reportRef} student={reportStudent} questionCounts={questionCounts} />
        </div>
      )}

    </div>
  );
};

export default StudentResults;