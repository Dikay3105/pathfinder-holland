import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { testBlocks, hollandTypeDescriptions, Major, universityNames } from '@/data/testData';
import { Check, BookOpen, GraduationCap, CheckCircle, BarChart3, Sparkles, ArrowRight, Target, Loader2, Download, MessageCircle } from 'lucide-react';
import { apiService, QuestionResponse, SubmitResultRequest, ResultResponse } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import schoolBackground from '@/assets/school-background.jpg';
import schoolLogo from '@/assets/school-logo1.png';
import { addDejavuFont } from "../../public/fonts/DejaVuSans"; // file chứa base64 font
import html2pdf from "html2pdf.js";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SearchableSelect } from '@/components/SearchableSelect';
import { optionsApi } from '@/services/optionsApi';
import { useRealtime } from '@/hooks/useRealtime';
import { AdviceView } from '@/components/AdviceView';
import { ResultReport, OFFSCREEN_STYLE } from '@/components/ResultReport';
import { savePdf, safeFileName } from '@/lib/pdfExport';
import { processTopGroups } from '@/utils/processTopGroups';


interface PersonalInfo {
  name: string;
  class: string;
  number: number;
  university: string;
  major: string;
  universityOther?: boolean; // true = học sinh tự nhập trường
  majorOther?: boolean;      // true = học sinh tự nhập ngành
}

interface HollandScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

interface TestAnswers {
  [questionId: number]: boolean;
}

interface ScoreInput {
  subject: string;
  currentScore: number;
  targetScore: number;
}

interface TestResult {
  topThreeTypes: Array<{ type: keyof HollandScores; score: number }>;
  compatibleMajors: any[]; // Will be populated from API
  selectedBlocks: string[];
  scores: ScoreInput[];
  apiResponse?: ResultResponse;
  recommendationText?: string;
  message?: string;
  advice?: string;
  /** pending = AI đang viết ở nền; done / fallback = đã có; timeout = chờ quá lâu */
  adviceStatus?: 'pending' | 'done' | 'fallback' | 'timeout';
  studentId?: string;
}

const HollandTest = () => {
  const location = useLocation();
  const student = location.state?.student; // dữ liệu đã truyền

  const pdfRef = useRef<HTMLDivElement>(null);
  const scrollDivRef = useRef(null);
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: '', class: '', number: '', university: '', major: '', universityOther: false, majorOther: false });
  const [testAnswers, setTestAnswers] = useState<TestAnswers>({});
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [scores, setScores] = useState<ScoreInput[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [universityOptions, setUniversityOptions] = useState<string[]>(universityNames);
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // API related states
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmittingResults, setIsSubmittingResults] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const navigate = useNavigate();
  const { id } = useParams();
  const query = new URLSearchParams(location.search);
  const autoExport = query.get('autoExport') === 'true';

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    setApiError('');
    try {
      const fetchedQuestions = await apiService.getQuestions();
      setQuestions(fetchedQuestions);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải câu hỏi');
      toast({
        title: "Lỗi tải dữ liệu",
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải câu hỏi',
        variant: "destructive"
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Load questions when component mounts
  useEffect(() => {
    loadQuestions();
  }, []);

  // Lời khuyên AI chạy nền: nhận qua realtime, kèm polling dự phòng nếu kết nối realtime rớt
  const advicePending = testResult?.adviceStatus === 'pending' && !!testResult?.studentId;
  const applyAdvice = (studentId: string, advice: string, adviceStatus: TestResult['adviceStatus']) => {
    setTestResult(prev => (prev && prev.studentId === studentId ? { ...prev, advice, adviceStatus } : prev));
  };
  // Nghe kênh riêng của học sinh này: chữ AI đang viết (progress), xoá khi đổi model (reset), bản cuối (student:advice)
  const updatePending = (sid: string, advice: string) =>
    setTestResult(prev =>
      prev && prev.studentId === sid && prev.adviceStatus === 'pending' ? { ...prev, advice } : prev
    );
  useRealtime(
    {
      'advice:progress': ({ id: sid, html }) => updatePending(sid, html),
      'advice:reset': ({ id: sid }) => updatePending(sid, ''),
      'student:advice': ({ id: sid, advice, adviceStatus }) => applyAdvice(sid, advice, adviceStatus),
    },
    advicePending,
    advicePending ? `student:${testResult!.studentId}` : undefined
  );
  useEffect(() => {
    if (!advicePending) return;
    const sid = testResult!.studentId!;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/students/${sid}`);
        const s = (await res.json())?.data;
        if (s && s.adviceStatus && s.adviceStatus !== 'pending') {
          applyAdvice(sid, s.advice, s.adviceStatus);
          return;
        }
      } catch {
        /* thử lại lần sau */
      }
      if (tries >= 30) {
        clearInterval(timer);
        setTestResult(prev => (prev && prev.studentId === sid ? { ...prev, adviceStatus: 'timeout' } : prev));
      }
    }, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advicePending, testResult?.studentId]);

  // Danh mục trường / ngành do admin quản lý (lỗi mạng → giữ danh sách trường mặc định)
  useEffect(() => {
    optionsApi
      .getPublic()
      .then(({ universities, majors }) => {
        if (universities.length) setUniversityOptions(universities);
        setMajorOptions(majors);
      })
      .catch(err => console.error('Không tải được danh mục trường/ngành:', err))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    // nếu không có id => về bước 1
    if (!id) {
      setStep(1);
      return;
    }

    const fetchStudent = async () => {
      setIsLoadingQuestions(true);
      setApiError('');

      try {
        let res = await apiService.getStudentById(id);
        const student = res.data?.student ?? res.data; // BE trả về { success, data: student }

        // ---- Áp dụng rule BE để tính topGroups ----
        const topGroups: TopGroup[] = processTopGroups(student.hollandScores || {});

        // ---- Gán vào state ----
        const result: TestResult = {
          topThreeTypes: topGroups,   // giữ nguyên tên field để không ảnh hưởng chỗ khác
          compatibleMajors: student.recommendedMajors || [],
          selectedBlocks: student.selectedBlocks || [],
          scores: student.scores || [],
          apiResponse: student,
          recommendationText: student.recommendationText || '',
          advice: student.advice,
          adviceStatus: student.adviceStatus,
          studentId: student._id
        };

        setPersonalInfo({
          name: student.name,
          class: student.class,
          number: student.number,
          university: student.university || '',
          major: student.major || '',
          universityOther: !!student.universityOther,
          majorOther: !!student.majorOther
        });
        setTestResult(result);
        setStep(5);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải câu hỏi';
        setApiError(message);
        toast({
          title: 'Lỗi tải dữ liệu',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchStudent();
  }, [id]);



  // // Nếu người dùng truy cập thẳng /result mà không có state
  // if (!student) {
  //   return <p>Không tìm thấy dữ liệu để xuất PDF</p>;
  // }



  const handlePersonalInfoNext = () => {
    if (
      personalInfo.name.toLocaleLowerCase() === "admin" &&
      personalInfo.class.toLocaleLowerCase() === "admin"
    ) {
      navigate('/admin');
      localStorage.setItem("token", "true");
      return;
    }

    // 🔎 kiểm tra từng trường, báo đúng lỗi của trường đó
    const name = personalInfo.name.trim();
    const cls = personalInfo.class.trim();
    const num = Number(personalInfo.number);
    const university = personalInfo.university.trim();
    const major = personalInfo.major.trim();

    const problem: [string, string] | null =
      !name ? ["Thiếu họ và tên", "Vui lòng nhập họ và tên."]
      : name.length > 50 ? ["Tên quá dài", "Tên không được vượt quá 50 ký tự."]
      : !cls ? ["Thiếu lớp", "Vui lòng nhập lớp (VD: 12A1)."]
      : cls.length > 10 ? ["Lớp không hợp lệ", "Tên lớp không được vượt quá 10 ký tự."]
      : !num ? ["Thiếu danh số", "Vui lòng nhập danh số của bạn."]
      : !Number.isInteger(num) || num < 1 || num > 100
        ? ["Danh số không hợp lệ", "Danh số phải là số từ 1 đến 100."]
      : !university
        ? personalInfo.universityOther
          ? ["Thiếu tên trường", "Bạn đã chọn \"Trường khác\" - vui lòng nhập tên trường."]
          : ["Thiếu trường đại học", "Vui lòng chọn trường đại học mong muốn."]
      : !major
        ? personalInfo.majorOther
          ? ["Thiếu tên ngành", "Bạn đã chọn \"Ngành khác\" - vui lòng nhập tên ngành."]
          : ["Thiếu ngành học", "Vui lòng chọn ngành học mong muốn."]
      : null;

    if (problem) {
      toast({ title: problem[0], description: problem[1], variant: "destructive" });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Dữ liệu chưa sẵn sàng",
        description: "Vui lòng đợi tải câu hỏi hoàn tất.",
        variant: "destructive",
      });
      return;
    }

    setStep(2);
  };


  const handleAnswerChange = (questionId: number, checked: boolean) => {
    setTestAnswers(prev => ({
      ...prev,
      [questionId]: checked
    }));
  };

  const handleBlockToggle = (blockId: string) => {
    setSelectedBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  const handleBlockSelectionNext = () => {
    if (selectedBlocks.length === 0) {
      toast({
        title: "Chưa chọn khối thi",
        description: "Vui lòng chọn ít nhất một khối thi.",
        variant: "destructive"
      });
      return;
    }

    // Get all subjects from selected blocks
    const allSubjects = new Set<string>();
    selectedBlocks.forEach(blockId => {
      const block = testBlocks.find(b => b.id === blockId);
      if (block) {
        const subjects = block.name.match(/\(([^)]+)\)/)?.[1].split(', ') || [];
        subjects.forEach(subject => allSubjects.add(subject));
      }
    });

    // Giữ điểm đã nhập của các môn vẫn còn trong khối đã chọn (khi quay lại đổi khối)
    const initialScores = Array.from(allSubjects).map(subject =>
      scores.find(s => s.subject === subject) ?? { subject, currentScore: 0, targetScore: 0 }
    );

    setScores(initialScores);
    setStep(4);
    setTimeout(() => {
      if (scrollDivRef.current) {
        scrollDivRef.current.scrollTo({
          top: 0,
          behavior: 'smooth', // Cuộn mượt mà
        });
      }
    }, 100);
  };

  const handleScoreChange = (index: number, field: 'currentScore' | 'targetScore', value: number) => {
    setScores(prev => prev.map((score, i) =>
      i === index ? { ...score, [field]: value } : score
    ));
  };

  const calculateResults = async () => {
    setIsSubmittingResults(true);
    setApiError('');

    try {
      // 1️⃣ Tính điểm Holland để gửi API (vẫn cần để lưu DB)
      const hollandScores: HollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      Object.entries(testAnswers).forEach(([questionId, isAnswered]) => {
        if (isAnswered) {
          const question = questions.find(q => q.id === parseInt(questionId));
          if (question) {
            hollandScores[question.type]++;
          }
        }
      });

      // 2️⃣ Chuẩn bị dữ liệu gửi API
      const submitData: SubmitResultRequest = {
        personalInfo,
        answers: testAnswers,
        selectedBlocks,
        scores,
        hollandScores
      };

      // 3️⃣ Gọi API lấy kết quả đã xử lý hoàn toàn từ BE
      const apiResponse = await apiService.submitResults(submitData);

      // 👉 BE đã trả sẵn: apiResponse.topGroups (mảng [{type, score}])
      const result: TestResult = {
        // ⚡ Lấy thẳng từ BE, không tự tính nữa
        topThreeTypes: apiResponse.topGroups || [],   // hoặc đổi tên sang topGroups nếu muốn
        compatibleMajors: apiResponse.recommendedMajors || [],
        selectedBlocks,
        scores,
        apiResponse,
        recommendationText: apiResponse.recommendationText,
        message: apiResponse.message,
        advice: apiResponse.advice,
        adviceStatus: apiResponse.adviceStatus || (apiResponse.advice ? 'done' : undefined),
        studentId: apiResponse.studentId || apiResponse.student?._id
      };
      console.log(result)
      setTestResult(result);
      setStep(5);

      setTimeout(() => {
        scrollDivRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      toast({
        title: 'Hoàn thành bài test!',
        description:
          'Kết quả Holland của bạn đã được tính toán.'
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý kết quả');
      toast({
        title: 'Lỗi xử lý kết quả',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý kết quả',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingResults(false);
    }
  };





  const resetTest = () => {
    setStep(1);
    setCurrentGroupIndex(0);
    setPersonalInfo({ name: '', class: '', number: '', university: '', major: '', universityOther: false, majorOther: false });
    setTestAnswers({});
    setSelectedBlocks([]);
    setScores([]);
    setScoreDrafts({});
    setTestResult(null);
    setApiError('');
    // Reload questions for new test
    loadQuestions();
  };

  const addLine = (doc, text, x, yState, lineHeight = 8) => {
    // nếu sắp chạm đáy trang (A4 cao 297mm, chừa lề 20)
    if (yState.value > 270) {
      doc.addPage();
      yState.value = 20; // đặt lại vị trí đầu trang mới
    }
    doc.text(text, x, yState.value);
    yState.value += lineHeight;
  };


  const generatePDF = () => {
    if (!testResult || !personalInfo) return;

    const doc = new jsPDF();

    // ✅ Thêm font hỗ trợ tiếng Việt (đảm bảo bạn đã có hàm addDejavuFont)
    addDejavuFont(doc);
    doc.setFont("DejaVuSans", "normal");

    const pageHeight = doc.internal.pageSize.getHeight(); // ≈ 297mm cho A4
    const bottomMargin = 20;

    const checkPageBreak = (nextY: number) => {
      if (nextY > pageHeight - bottomMargin) {
        doc.addPage();
        return 20; // reset yPosition cho trang mới
      }
      return nextY;
    };

    // ===== Giữ nguyên nội dung cũ =====
    doc.setFontSize(20);
    doc.text("KẾT QUẢ TEST HOLLAND", 105, 20, { align: "center" });
    doc.setFontSize(16);
    doc.text("TRƯỜNG THPT NGUYỄN HIỀN", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.text("Họ và tên: " + personalInfo.name, 20, 50);
    doc.text("Lớp: " + personalInfo.class, 20, 60);
    doc.text(
      "Nhóm Holland: " +
      testResult.topThreeTypes.map((item) => item.type).join(""),
      20,
      70
    );

    if (testResult.recommendationText) {
      doc.setFontSize(14);
      doc.text("KẾT QUẢ PHÂN TÍCH:", 20, 90);

      const lines = doc.splitTextToSize(testResult.recommendationText, 170);
      doc.setFontSize(12);
      let yPosition = 105;

      lines.forEach((line) => {
        yPosition = checkPageBreak(yPosition + 8);
        doc.text(line, 20, yPosition);
      });

      if (testResult.compatibleMajors && testResult.compatibleMajors.length > 0) {
        yPosition = checkPageBreak(yPosition + 15);
        doc.setFontSize(14);
        doc.text("NGÀNH HỌC PHÙ HỢP:", 20, yPosition);
        yPosition += 10;

        testResult.compatibleMajors.slice(0, 8).forEach((major, index) => {
          yPosition = checkPageBreak(yPosition + 8);
          doc.setFontSize(11);
          doc.text(index + 1 + ". " + major.name, 25, yPosition);

          if (major.description) {
            const descLines = doc.splitTextToSize("   " + major.description, 150);
            doc.setFontSize(9);
            descLines.forEach((desc) => {
              yPosition = checkPageBreak(yPosition + 6);
              doc.text(desc, 30, yPosition);
            });
          }
          yPosition += 3;
        });
      }
    } else {
      doc.setFontSize(14);
      doc.text("TOP 3 NHÓM HOLLAND CỦA BẠN:", 20, 90);

      let yPosition = 100;
      testResult.topThreeTypes.forEach((item, index) => {
        yPosition = checkPageBreak(yPosition + 15);
        doc.setFontSize(12);
        doc.text(
          index + 1 + ". " + hollandTypeDescriptions[item.type].name +
          " (" + item.score + "/10)",
          25,
          yPosition
        );
      });
    }

    // Footer (đặt ở trang cuối cùng)
    doc.setFontSize(8);
    const dateText = "Ngày tạo: " + new Date().toLocaleDateString("vi-VN");
    const footerY = pageHeight - 10;
    doc.text(dateText, 20, footerY);

    const safeName = personalInfo.name.replace(/[\\/:*?"<>|]/g, "_");
    const fileName =
      "KetQuaHollandTest_" + safeName + "_" + personalInfo.class + "_" + Date.now() + ".pdf";

    doc.save(fileName);

    toast({
      title: "Xuất PDF thành công!",
      description: "Đã lưu file: " + fileName,
    });
  };



  // Group questions by Holland type for the test step
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const groupedQuestions = questions.reduce((groups, question) => {
    if (!groups[question.type]) {
      groups[question.type] = [];
    }
    groups[question.type].push(question);
    return groups;
  }, {} as Record<string, QuestionResponse[]>);

  // Thứ tự nhóm cố định R-I-A-S-E-C (không phụ thuộc id câu hỏi khi admin thêm/chuyển nhóm)
  const HOLLAND_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'];
  const groupTypes = Object.keys(groupedQuestions).sort((a, b) => HOLLAND_ORDER.indexOf(a) - HOLLAND_ORDER.indexOf(b));
  const currentGroup = groupTypes[currentGroupIndex];
  const currentQuestions = groupedQuestions[currentGroup] || [];
  const containerMaxWidth = step <= 2 ? 'max-w-2xl' : step <= 4 ? 'max-w-4xl' : 'max-w-6xl';

  const handleNextGroup = () => {
    if (currentGroupIndex < groupTypes.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      // Auto-scroll to top after state update

    } else {
      const hollandScores: HollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

      Object.entries(testAnswers).forEach(([questionId, isAnswered]) => {
        if (isAnswered) {
          const question = questions.find(q => q.id === parseInt(questionId));
          if (question) {
            hollandScores[question.type]++;
          }
        }
      });

      // ✅ Kiểm tra: phải có ít nhất 3 nhóm có điểm > 0
      const groupsWithScore = Object.values(hollandScores).filter(v => v > 0).length;
      if (groupsWithScore < 3) {
        toast({
          title: "Chưa đủ câu trả lời",
          description: "Bạn cần chọn hoạt động ở ít nhất 3 nhóm để có kết quả chính xác. Hãy quay lại các nhóm trước để chọn thêm.",
          variant: "destructive",
        });
        return; // dừng lại, không gửi API
      }
      setStep(3);
    }
    setTimeout(() => {
      if (scrollDivRef.current) {
        scrollDivRef.current.scrollTo({
          top: 0,
          behavior: 'smooth', // Cuộn mượt mà
        });
      }
    }, 100);
  };

  const handlePrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      // Auto-scroll to top after state update
      setTimeout(() => {
        if (scrollDivRef.current) {
          scrollDivRef.current.scrollTo({
            top: 0,
            behavior: 'smooth', // Cuộn mượt mà
          });
        }
      }, 100);
    }
  };

  const renderPersonalInfoStep = () => (
    <Card className="w-full max-w-2xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-primary text-primary-foreground rounded-t-lg px-5 py-6 sm:p-6">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          <CardTitle className="text-xl sm:text-3xl font-bold leading-tight">Test Holland - Định hướng nghề nghiệp</CardTitle>
        </div>
        <p className="text-primary-foreground/90 text-sm sm:text-lg">
          Khám phá khả năng và sở thích của bạn để tìm ra ngành học phù hợp
        </p>
      </CardHeader>
      <CardContent className="p-5 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">Họ và tên</Label>
            <Input
              id="name"
              value={personalInfo.name}
              onChange={e => {
                const raw = e.target.value;
                // Giới hạn tối đa 50 ký tự
                const limited = raw.slice(0, 50);
                setPersonalInfo(prev => ({ ...prev, name: limited }));
              }}
              placeholder="Nhập họ và tên của bạn"
              className="h-12 text-base"
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class" className="text-base font-medium">Lớp</Label>
            <Input
              id="class"
              value={personalInfo.class}
              onChange={e => {
                const raw = e.target.value;

                // 🔹 Chỉ giữ lại ký tự chữ cái và số (bỏ các ký tự đặc biệt như mũ, khoảng trắng...)
                const cleaned = raw
                  .normalize("NFKD")                 // chuẩn hóa để tách các ký tự Unicode đặc biệt
                  .replace(/[^\w]/g, '')             // chỉ giữ chữ và số
                  .toUpperCase();                    // chuyển hết thành in hoa

                // 🔹 Bỏ các số 0 thừa (như 12A01 -> 12A1)
                const normalized = cleaned.replace(/0+(\d)/g, '$1').slice(0, 10);

                setPersonalInfo(prev => ({ ...prev, class: normalized }));
              }}
              placeholder="Nhập lớp của bạn (VD: 12A1)"
              className="h-12 text-base"
            />

          </div>

          <div className="space-y-2">
            <Label htmlFor="number" className="text-base font-medium">Danh số</Label>
            <Input
              id="number"
              inputMode="numeric"
              pattern="[0-9]*"
              // 🔑 chỉ nguyên
              value={personalInfo.number ?? ''}     // vẫn hiển thị rỗng nếu undefined
              onChange={e => {
                let num = parseInt(e.target.value || '0', 10);
                if (isNaN(num)) num = 0;
                if (num > 999) num = 999; // giới hạn 3 chữ số
                setPersonalInfo(prev => ({ ...prev, number: num }));
              }}
              placeholder="Nhập danh số của bạn"
              className="h-12 text-base"
              onKeyDown={e => {
                if (e.key === 'Enter') handlePersonalInfoNext();
              }}
              maxLength={3}
            />
          </div>

          {/* --- Chọn trường đại học --- */}
          <div className="space-y-2">
            <Label htmlFor="university" className="text-base font-medium">Trường Đại học mong muốn</Label>
            <SearchableSelect
              id="university"
              title="Chọn trường đại học"
              options={universityOptions}
              value={personalInfo.university}
              isOther={personalInfo.universityOther}
              onSelect={(val, other) =>
                setPersonalInfo(prev => ({ ...prev, university: val, universityOther: other }))
              }
              placeholder="Chọn trường"
              searchPlaceholder="Tìm trường (gõ không dấu cũng được)..."
              allowOther
              otherLabel="Trường khác (tự nhập)"
              loading={optionsLoading && universityOptions.length === 0}
            />
            {personalInfo.universityOther && (
              <Input
                value={personalInfo.university}
                onChange={e => {
                  const value = e.target.value.slice(0, 120);
                  setPersonalInfo(prev => ({ ...prev, university: value }));
                }}
                placeholder="Nhập tên trường bạn mong muốn"
                className="h-12 text-base"
                maxLength={120}
                autoFocus
              />
            )}
          </div>

          {/* --- Chọn ngành học --- */}
          <div className="space-y-2">
            <Label htmlFor="major" className="text-base font-medium">Ngành học mong muốn</Label>
            <SearchableSelect
              id="major"
              title="Chọn ngành học"
              options={majorOptions}
              value={personalInfo.major}
              isOther={personalInfo.majorOther}
              onSelect={(val, other) =>
                setPersonalInfo(prev => ({ ...prev, major: val, majorOther: other }))
              }
              placeholder="Chọn ngành học"
              searchPlaceholder="Tìm ngành (VD: cong nghe thong tin)..."
              allowOther
              otherLabel="Ngành khác (tự nhập)"
              loading={optionsLoading && majorOptions.length === 0}
            />
            {personalInfo.majorOther && (
              <Input
                value={personalInfo.major}
                onChange={e => {
                  const value = e.target.value.slice(0, 80);
                  setPersonalInfo(prev => ({ ...prev, major: value }));
                }}
                placeholder="Nhập ngành học bạn mong muốn"
                className="h-12 text-base"
                maxLength={80}
                autoFocus
              />
            )}
            {!personalInfo.majorOther && (
              <p className="text-sm text-muted-foreground">
                Không thấy ngành của bạn? Chọn <span className="font-medium">"Ngành khác"</span> ở cuối danh sách để tự nhập.
              </p>
            )}
          </div>
        </div>

        {apiError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{apiError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadQuestions}
              className="mt-2"
              disabled={isLoadingQuestions}
            >
              {isLoadingQuestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Thử lại
            </Button>
          </div>
        )}
        <Button
          onClick={handlePersonalInfoNext}
          disabled={isLoadingQuestions || questions.length === 0}
          className="w-full h-12 text-base bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {isLoadingQuestions ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Đang tải câu hỏi...
            </>
          ) : (
            <>
              Tiếp tục <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const scrollToTop = () => {
    setTimeout(() => {
      scrollDivRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const goToStep = (next: number) => {
    setStep(next);
    scrollToTop();
  };

  const renderTestStep = () => {
    const groupInfo = hollandTypeDescriptions[currentGroup as keyof HollandScores];
    const selectedInGroup = currentQuestions.filter(q => testAnswers[q.id]).length;

    return (
      <Card className="w-full max-w-2xl mx-auto shadow-medium overflow-hidden">
        <CardHeader className="bg-gradient-warm text-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-2xl font-bold leading-tight">
              Nếu có điều kiện, tôi sẽ...
            </CardTitle>
            <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs sm:text-sm font-semibold tabular-nums">
              {currentGroupIndex + 1}/{groupTypes.length}
            </span>
          </div>
          <p className="text-white/90 text-xs sm:text-sm mt-1">
            Chạm vào những hoạt động bạn thấy phù hợp{groupInfo?.name ? ` · ${groupInfo.name}` : ''}
          </p>
          {/* chấm tiến độ từng nhóm */}
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {groupTypes.map((g, i) => (
              <span
                key={g}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentGroupIndex ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {currentQuestions.map((question) => {
              const checked = !!testAnswers[question.id];
              return (
                <button
                  type="button"
                  key={question.id}
                  aria-pressed={checked}
                  onClick={() => handleAnswerChange(question.id, !checked)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-3 sm:px-4 text-left transition-colors duration-150 active:scale-[0.99] ${checked
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                    : 'border-transparent bg-muted/60 text-foreground hover:bg-muted'
                    }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40 bg-background'}`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-[15px] sm:text-base leading-snug">{question.text}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Đã chọn {selectedInGroup}/{currentQuestions.length} hoạt động trong nhóm này
          </p>
        </CardContent>
      </Card>
    );
  };

  const renderBlockSelectionStep = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-medium overflow-hidden">
      <CardHeader className="bg-gradient-secondary text-white px-4 py-4 sm:px-6 sm:py-5">
        <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          Chọn khối thi đại học
        </CardTitle>
        <p className="text-white/90 text-xs sm:text-sm">Chọn các khối bạn dự định xét tuyển (có thể chọn nhiều)</p>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {testBlocks.map(block => {
            const selected = selectedBlocks.includes(block.id);
            const subjects = block.name.match(/\(([^)]+)\)/)?.[1] || block.name;
            return (
              <button
                type="button"
                key={block.id}
                aria-pressed={selected}
                onClick={() => handleBlockToggle(block.id)}
                className={`relative rounded-lg border-2 p-3 text-left transition-colors active:scale-[0.98] ${selected
                  ? 'border-primary bg-primary/10'
                  : 'border-muted bg-background hover:border-primary/60'
                  }`}
              >
                {selected && <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                <div className="text-lg font-bold text-primary leading-none">{block.id}</div>
                <div className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">{subjects}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const excludedSubjects = [

  ];

  /** Cho phép gõ "7.", "7,5" khi nhập điểm (lưu chuỗi tạm, số thật được cập nhật song song). */
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  const handleScoreInput = (index: number, subject: string, field: 'currentScore' | 'targetScore', raw: string) => {
    let text = raw.replace(',', '.').replace(/[^\d.]/g, '');
    const firstDot = text.indexOf('.');
    if (firstDot >= 0) text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    let value = parseFloat(text);
    if (value > 10) {
      value = 10;
      text = '10';
    }
    setScoreDrafts(prev => ({ ...prev, [`${subject}|${field}`]: text }));
    handleScoreChange(index, field, Number.isFinite(value) ? value : 0);
  };

  const scoreDisplay = (subject: string, field: 'currentScore' | 'targetScore', value: number) => {
    const draft = scoreDrafts[`${subject}|${field}`];
    if (draft !== undefined) return draft;
    return value ? String(value) : '';
  };

  const renderScoreInputStep = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-medium overflow-hidden">
      <CardHeader className="bg-gradient-success text-white px-4 py-4 sm:px-6 sm:py-5">
        <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          Điền điểm số của bạn
        </CardTitle>
        <p className="text-white/90 text-xs sm:text-sm">
          Điểm hiện tại và điểm mong muốn (thang 10). Có thể bỏ trống nếu chưa có điểm.
        </p>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="hidden sm:grid grid-cols-[1fr_140px_140px] gap-3 px-4 pb-2 text-sm font-medium text-muted-foreground">
          <span>Môn học</span>
          <span className="text-center">Hiện tại</span>
          <span className="text-center">Mong muốn</span>
        </div>
        <div className="space-y-2">
          {scores
            .filter(score => !excludedSubjects.includes(score.subject))
            .map((score, index) => (
              <div
                key={score.subject}
                className="grid grid-cols-2 sm:grid-cols-[1fr_140px_140px] items-center gap-2 sm:gap-3 rounded-lg bg-muted px-3 py-3 sm:px-4"
              >
                <h3 className="col-span-2 sm:col-span-1 font-semibold text-base">{score.subject}</h3>
                {(['currentScore', 'targetScore'] as const).map(field => (
                  <label key={field} className="block">
                    <span className="mb-1 block text-xs text-muted-foreground sm:hidden">
                      {field === 'currentScore' ? 'Hiện tại' : 'Mong muốn'}
                    </span>
                    <Input
                      inputMode="decimal"
                      enterKeyHint="next"
                      value={scoreDisplay(score.subject, field, score[field])}
                      onChange={e => handleScoreInput(index, score.subject, field, e.target.value)}
                      placeholder="VD: 7,5"
                      className="h-11 text-base text-center bg-background"
                      aria-label={`${score.subject} - ${field === 'currentScore' ? 'điểm hiện tại' : 'điểm mong muốn'}`}
                    />
                  </label>
                ))}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );

  /** Thanh hành động cố định dưới màn hình cho bước 2–4 */
  const renderBottomBar = () => {
    let back: { label: string; onClick: () => void } | null = null;
    let info = '';
    let next: { label: React.ReactNode; onClick: () => void; disabled?: boolean } | null = null;

    if (step === 2) {
      const selected = currentQuestions.filter(q => testAnswers[q.id]).length;
      const isLast = currentGroupIndex === groupTypes.length - 1;
      back = currentGroupIndex > 0
        ? { label: 'Quay lại', onClick: handlePrevGroup }
        : { label: 'Thông tin', onClick: () => goToStep(1) };
      info = `Đã chọn ${selected}/${currentQuestions.length}`;
      next = {
        label: <>{isLast ? 'Chọn khối thi' : 'Nhóm tiếp'} <ArrowRight className="w-4 h-4 ml-1" /></>,
        onClick: handleNextGroup,
      };
    } else if (step === 3) {
      back = { label: 'Quay lại', onClick: () => goToStep(2) };
      info = selectedBlocks.length ? `Đã chọn ${selectedBlocks.length} khối` : 'Chưa chọn khối';
      next = {
        label: <>Nhập điểm <ArrowRight className="w-4 h-4 ml-1" /></>,
        onClick: handleBlockSelectionNext,
        disabled: selectedBlocks.length === 0,
      };
    } else if (step === 4) {
      back = { label: 'Quay lại', onClick: () => goToStep(3) };
      const filled = scores.filter(s => s.currentScore > 0).length;
      info = isSubmittingResults ? 'Đang tính kết quả…' : `Đã nhập ${filled}/${scores.length} môn`;
      next = {
        label: isSubmittingResults
          ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Đang xử lý</>
          : <>Hoàn thành <CheckCircle className="w-4 h-4 ml-1" /></>,
        onClick: calculateResults,
        disabled: isSubmittingResults,
      };
    } else {
      return null;
    }

    return (
      <div className="flex-shrink-0 border-t bg-white/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
        <div className={`w-full ${containerMaxWidth} mx-auto flex items-center gap-2 px-3 py-2.5 sm:px-4`}>
          <Button
            variant="outline"
            onClick={back.onClick}
            disabled={isSubmittingResults}
            className="h-11 shrink-0 px-3 sm:px-5"
          >
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
            {back.label}
          </Button>
          <p className="min-w-0 flex-1 truncate text-center text-xs sm:text-sm text-muted-foreground">{info}</p>
          <Button
            onClick={next.onClick}
            disabled={next.disabled}
            className="h-11 shrink-0 px-4 sm:px-6 bg-gradient-primary hover:shadow-glow"
          >
            {next.label}
          </Button>
        </div>
      </div>
    );
  };

  // ===== Xuất PDF: dùng bản báo cáo A4 riêng (components/ResultReport) thay vì chụp giao diện web =====
  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const questionCounts = Object.fromEntries(
    Object.entries(groupedQuestions).map(([type, list]) => [type, list.length])
  );

  const reportStudent = (() => {
    const api: any = testResult?.apiResponse;
    const saved = api?.student ?? api ?? {};
    return {
      ...saved,
      name: personalInfo.name,
      class: personalInfo.class,
      number: personalInfo.number,
      university: personalInfo.university,
      major: personalInfo.major,
      selectedBlocks: testResult?.selectedBlocks ?? saved.selectedBlocks,
      recommendedMajors: testResult?.compatibleMajors ?? saved.recommendedMajors,
      advice: testResult?.advice ?? saved.advice,
    };
  })();

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      // đợi ResultReport được render ngoài màn hình
      await new Promise(r => setTimeout(r, 50));
      if (!reportRef.current) return;
      await savePdf(reportRef.current, safeFileName('KetQua', personalInfo.name, personalInfo.class, personalInfo.number) + '.pdf');
      toast({ title: 'Đã xuất PDF' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Không xuất được PDF', description: 'Vui lòng thử lại.', variant: 'destructive' });
    } finally {
      setExportingPdf(false);
    }
  };

  const renderResultStep = () => (
    <div className="w-full max-w-6xl mx-auto space-y-6" >
      <Card className="shadow-medium" ref={pdfRef}>
        <CardHeader className="text-center bg-gradient-success text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <CheckCircle className="w-8 h-8" />
            Kết quả Test Holland
          </CardTitle>
          <p className="text-white/90">
            Chào {personalInfo.name} - Lớp {personalInfo.class} - Danh số {personalInfo.number}
          </p>
          <p className="text-white/90">
            Trường Đại học: {personalInfo.university || 'Chưa chọn'} - Ngành học mong muốn: {personalInfo.major || 'Chưa nhập'}
          </p>
          <div className="text-white/80 text-center mt-2">
            Kết quả: Bạn thuộc nhóm{" "}
            <span className="font-bold text-white">
              {testResult?.topThreeTypes?.length
                ? testResult.topThreeTypes.map(item => item.type).join('')
                : 'cân bằng'}
            </span>
          </div>

        </CardHeader>
        <CardContent className="p-8">
          {/* Recommendation Text from API - Priority display */}

          {/* lg:grid-cols-2 */}
          <div className="grid grid-cols-1  gap-8">
            {/* Show Holland types details only if no API recommendation text */}
            {/* {!testResult?.recommendationText && ( */}
            {testResult?.topThreeTypes?.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Top nhóm Holland của bạn
                </h3>

                <div className="space-y-3">
                  {testResult.topThreeTypes.map((item, index) => (
                    <div
                      key={item.type}
                      className="flex items-center space-x-4 p-4 bg-muted rounded-lg"
                    >
                      <div className="text-2xl font-bold text-primary">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {hollandTypeDescriptions[item.type].name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {hollandTypeDescriptions[item.type].description}
                        </div>
                      </div>
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary shrink-0 tabular-nums">
                        {item.score}/{groupedQuestions[item.type]?.length || 10}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* )} */}

            {testResult?.recommendationText && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Kết quả phân tích Holland
                </h3>
                <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {testResult.recommendationText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(testResult?.advice || testResult?.adviceStatus === 'pending' || testResult?.adviceStatus === 'timeout') && (
              <div className="card page-break mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Lời khuyên dành cho bạn
                </h3>
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  {testResult.adviceStatus === 'pending' && !testResult.advice ? (
                    <div className="no-print" aria-live="polite">
                      <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        AI đang viết lời khuyên riêng cho bạn… thường mất 30–60 giây, bạn cứ xem kết quả bên trên nhé.
                      </div>
                      <div className="mt-5 space-y-3 animate-pulse">
                        <div className="h-4 w-1/3 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-11/12 rounded bg-muted" />
                        <div className="h-3 w-4/5 rounded bg-muted" />
                        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                          <div className="h-24 rounded-lg bg-muted" />
                          <div className="h-24 rounded-lg bg-muted" />
                        </div>
                      </div>
                    </div>
                  ) : testResult.adviceStatus === 'timeout' && !testResult.advice ? (
                    <p className="text-sm text-muted-foreground">
                      Lời khuyên đang được tạo lâu hơn bình thường. Kết quả của bạn đã được lưu – thầy cô có thể xem lời khuyên trong trang quản lý, hoặc bạn tải lại trang sau ít phút.
                    </p>
                  ) : (
                    <>
                      <AdviceView html={testResult.advice || ''} streaming={testResult.adviceStatus === 'pending'} />
                      {testResult.adviceStatus === 'pending' && (
                        <div className="adv-writing no-print" role="status">
                          <span className="adv-writing-dots"><span /><span /><span /></span>
                          AI đang viết tiếp…
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* <div>
              <h3 className="text-xl font-bold mb-4">Ngành học được đề xuất</h3>
              <div className="space-y-3">
                {testResult?.compatibleMajors && testResult.compatibleMajors.length > 0 ? (
                  testResult.compatibleMajors.slice(0, 6).map((major, index) => (
                    <div key={major._id || index} className="card p-4 bg-education-green/10 border border-education-green/20 rounded-lg">
                      <h4 className="font-bold text-education-green">{major.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{major.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {major.examBlocks?.filter((block: string) => testResult.selectedBlocks.includes(block)).map((block: string) => (
                          <Badge key={block} variant="secondary" className="text-xs">
                            {block}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-education-orange/10 border border-education-orange/20 rounded-lg">
                    <p className="text-education-orange">
                      {testResult?.compatibleMajors ?
                        "Không tìm thấy ngành học phù hợp hoàn toàn với kết quả Holland và khối thi đã chọn. Hãy tham khảo thêm ý kiến từ thầy cô hướng nghiệp." : testResult?.apiResponse?.message}
                    </p>
                  </div>
                )}
              </div>
            </div> */}
          </div>

          {testResult?.scores && testResult.scores.some(s => s.currentScore > 0) && !testResult.advice?.includes('class="adv"') && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Lời khuyên về điểm số</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testResult.scores.map((score, index) => {
                  const gap = score.targetScore - score.currentScore;
                  return (
                    <div key={index} className="p-4 bg-muted rounded-lg">
                      <h4 className="font-bold text-center mb-2">{score.subject}</h4>
                      <div className="text-center space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Hiện tại: <span className="font-medium">{score.currentScore}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mục tiêu: <span className="font-medium">{score.targetScore}</span>
                        </div>
                        <div className={`text-sm font-medium ${gap > 0 ? 'text-education-orange' : gap === 0 ? 'text-education-green' : 'text-muted-foreground'
                          }`}>
                          {gap > 0 ? `Cần cải thiện: +${gap.toFixed(1)}` :
                            gap === 0 ? 'Đã đạt mục tiêu' :
                              'Vượt mục tiêu'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


        </CardContent>
      </Card>
      <div className="no-print mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          onClick={exportPDF}
          variant="outline"
          disabled={testResult?.adviceStatus === 'pending' || exportingPdf}
          title={testResult?.adviceStatus === 'pending' ? 'Đợi AI viết xong lời khuyên để PDF có đủ nội dung' : undefined}
          className="no-print px-8 py-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          {testResult?.adviceStatus === 'pending'
            ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Đang chờ lời khuyên…</>
            : exportingPdf
              ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Đang tạo PDF…</>
              : <><Download className="w-5 h-5 mr-2" />Xuất PDF</>}
        </Button>
        <Button
          onClick={resetTest}
          className="no-print bg-gradient-primary hover:shadow-glow px-8 py-3"
        >
          Làm lại bài test
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className="h-[100dvh] flex flex-col relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${schoolBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll'
      }}
    >
      {/* School Header - Fixed (gọn lại khi đang làm bài) */}
      {step >= 2 && step <= 4 ? (
        <div className="flex-shrink-0 px-3 pt-3 pb-2 sm:px-4">
          <div className={`w-full ${containerMaxWidth} mx-auto`}>
            <div className="flex items-center gap-3 rounded-lg bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
              <img src={schoolLogo} alt="Logo trường THPT Nguyễn Hiền" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-primary">
                    {step === 2 ? 'Trắc nghiệm Holland' : step === 3 ? 'Chọn khối thi' : 'Điểm số'}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">Bước {step - 1}/3</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${step === 2
                        ? ((currentGroupIndex + 1) / Math.max(groupTypes.length, 1)) * 60
                        : step === 3 ? 75 : 95}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className={`w-full ${containerMaxWidth} mx-auto`}>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 sm:p-4">
            <div className="flex flex-row items-center justify-center gap-3">
              <img
                src={schoolLogo}
                alt="Logo trường THPT Nguyễn Hiền"
                className="w-10 h-10 md:w-16 md:h-16 object-contain"
              />
              <div className="text-center md:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sở Giáo dục và Đào tạo TP. Hồ Chí Minh
                </p>
                <h1 className="text-lg md:text-xl font-bold text-primary mb-1">
                  TRƯỜNG THPT NGUYỄN HIỀN
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      )}
      {/* Main Content - Scrollable */}
      <div ref={scrollDivRef} className="flex-1 overflow-y-auto px-4 pb-4 custom-scroll">
        <div className={`w-full ${containerMaxWidth} mx-auto`}>
          {step === 1 && renderPersonalInfoStep()}
          {step === 2 && renderTestStep()}
          {step === 3 && renderBlockSelectionStep()}
          {step === 4 && renderScoreInputStep()}
          {step === 5 && renderResultStep()}
        </div>
      </div>

      {renderBottomBar()}

      {exportingPdf && (
        <div style={OFFSCREEN_STYLE} aria-hidden>
          <ResultReport ref={reportRef} student={reportStudent} questionCounts={questionCounts} />
        </div>
      )}
    </div>
  );
};

export default HollandTest;
