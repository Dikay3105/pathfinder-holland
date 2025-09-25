import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { testBlocks, hollandTypeDescriptions, Major } from '@/data/testData';
import { BookOpen, GraduationCap, CheckCircle, BarChart3, Sparkles, ArrowRight, Target, Loader2, Download } from 'lucide-react';
import { apiService, QuestionResponse, SubmitResultRequest, ResultResponse } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import schoolBackground from '@/assets/school-background.jpg';
import schoolLogo from '@/assets/school-logo1.png';
import { addDejavuFont } from "../../public/fonts/DejaVuSans"; // file chứa base64 font
import html2pdf from "html2pdf.js";
import { useLocation, useNavigate } from 'react-router-dom';


interface PersonalInfo {
  name: string;
  class: string;
  number: number;
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
}

const HollandTest = () => {
  const location = useLocation();
  const student = location.state?.student; // dữ liệu đã truyền

  const pdfRef = useRef<HTMLDivElement>(null);
  const scrollDivRef = useRef(null);
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: '', class: '', number: '' });
  const [testAnswers, setTestAnswers] = useState<TestAnswers>({});
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [scores, setScores] = useState<ScoreInput[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // API related states
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmittingResults, setIsSubmittingResults] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!student) return;

    // ---- 1️⃣ Sắp xếp giảm dần ----
    const sorted = Object.entries(student.hollandScores || {})
      .map(([k, v]) => [k as keyof HollandScores, Number(v)])
      .sort((a, b) => b[1] - a[1]); // ví dụ [['S',2], ['R',1], ['I',1], ...]

    // ---- 2️⃣ Gom thành các bucket theo điểm ----
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

    // ---- 3️⃣ Áp dụng quy tắc BE ----
    let topGroups: { type: keyof HollandScores; score: number }[] = [];
    if (buckets.length > 0) {
      const maxBucket = buckets[0];
      // Nếu bucket đầu >=4 nhóm (hoặc tất cả 6 nhóm bằng nhau) => rỗng
      if (maxBucket.types.length >= 4 || (buckets.length === 1 && maxBucket.types.length === 6)) {
        topGroups = [];
      } else {
        const included: { type: keyof HollandScores; score: number }[] = [];
        for (let b of buckets) {
          // chỉ thêm trọn bucket nếu sau khi thêm vẫn <= 3 nhóm
          if (included.length + b.types.length <= 3) {
            b.types.forEach(t => included.push({ type: t as keyof HollandScores, score: b.score }));
          } else {
            break; // nếu vượt quá 3 thì dừng, không thêm một phần bucket
          }
        }
        topGroups = included;
      }
    }

    // ---- 4️⃣ Gán vào state ----
    const result: TestResult = {
      topThreeTypes: topGroups,                          // chính là topGroups đã tính
      compatibleMajors: student.recommendedMajors || [],
      selectedBlocks: student.selectedBlocks || [],
      scores: student.scores || [],
      apiResponse: student,
      recommendationText: student.recommendationText || "",
    };

    setPersonalInfo({
      name: student.name,
      class: student.class,
      number: student.number,
    });
    setTestResult(result);
    setStep(5);
  }, [student]);


  // // Nếu người dùng truy cập thẳng /result mà không có state
  // if (!student) {
  //   return <p>Không tìm thấy dữ liệu để xuất PDF</p>;
  // }



  const handlePersonalInfoNext = () => {
    if (!personalInfo.name.trim() || !personalInfo.class.trim() || !personalInfo.number || personalInfo.number <= 0) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Vui lòng điền đầy đủ họ tên, lớp và danh số.",
        variant: "destructive"
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Dữ liệu chưa sẵn sàng",
        description: "Vui lòng đợi tải câu hỏi hoàn tất.",
        variant: "destructive"
      });
      return;
    }

    if (personalInfo.name.toLocaleLowerCase() === "admin" && personalInfo.class.toLocaleLowerCase() === "admin") {

      navigate('/admin');
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

    const initialScores = Array.from(allSubjects).map(subject => ({
      subject,
      currentScore: 0,
      targetScore: 0
    }));

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
        message: apiResponse.message
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
          apiResponse.recommendationText ||
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
    setPersonalInfo({ name: '', class: '', number: '' });
    setTestAnswers({});
    setSelectedBlocks([]);
    setScores([]);
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

  const groupTypes = Object.keys(groupedQuestions);
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
        alert("Bạn cần trả lời đủ để có ít nhất 3 nhóm Holland có điểm trước khi nộp bài.");
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
      <CardHeader className="text-center bg-gradient-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <GraduationCap className="w-8 h-8" />
          <CardTitle className="text-3xl font-bold">Test Holland - Định hướng nghề nghiệp</CardTitle>
        </div>
        <p className="text-primary-foreground/90 text-lg">
          Khám phá khả năng và sở thích của bạn để tìm ra ngành học phù hợp
        </p>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">Họ và tên</Label>
            <Input
              id="name"
              value={personalInfo.name}
              onChange={e =>
                setPersonalInfo(prev => ({ ...prev, name: e.target.value }))
              }
              placeholder="Nhập họ và tên của bạn"
              className="h-12 text-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class" className="text-base font-medium">Lớp</Label>
            <Input
              id="class"
              value={personalInfo.class}
              onChange={e =>
                setPersonalInfo(prev => ({ ...prev, class: e.target.value }))
              }
              placeholder="Nhập lớp của bạn (VD: 12A1)"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number" className="text-base font-medium">Danh số</Label>
            <Input
              id="number"
              // 🔑 chỉ nguyên
              value={personalInfo.number ?? ''}     // vẫn hiển thị rỗng nếu undefined
              onChange={e => {
                setPersonalInfo(prev => ({
                  ...prev,
                  number: Math.max(0, parseInt(e.target.value || '0', 10)) // ép nguyên & không âm
                }))
              }
              }
              placeholder="Nhập danh số của bạn"
              className="h-12 text-base"
              onKeyDown={e => {
                if (e.key === 'Enter') handlePersonalInfoNext();
              }}
            />
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

  const renderTestStep = () => {
    const groupInfo = hollandTypeDescriptions[currentGroup as keyof HollandScores];

    return (
      <Card className="w-full max-w-2xl mx-auto shadow-medium">
        <CardHeader className="bg-gradient-warm text-white rounded-t-lg relative">
          <div className="absolute top-4 right-6 text-white/80 font-medium">
            {currentGroupIndex + 1} / {groupTypes.length}
          </div>
          <CardTitle className="text-2xl font-bold text-center pt-2">
            Nếu có điều kiện, tôi sẽ...
          </CardTitle>
          <p className="text-white/90 text-sm text-center mt-2">
            Đánh dấu vào các hoạt động bạn cảm thấy phù hợp
          </p>
          <p className="text-white/80 text-xs text-center mt-2">
            ({groupInfo?.name})
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-4">
            {currentQuestions.map((question) => (
              <div
                key={question.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${testAnswers[question.id]
                  ? 'bg-education-green text-white border-education-green'
                  : 'border-muted bg-background hover:bg-muted/50'
                  }`}
                onClick={() => handleAnswerChange(question.id, !testAnswers[question.id])}
              >
                <div className="flex items-center space-x-4" >
                  <Checkbox
                    id={`question-${question.id}`}
                    checked={testAnswers[question.id] || false}
                    onCheckedChange={(checked) =>
                      handleAnswerChange(question.id, checked as boolean)
                    }
                  // className="pointer-events-none"
                  />
                  <Label
                    // htmlFor={`question-${question.id}`}
                    className="text-base leading-relaxed cursor-pointer flex-1"
                  >
                    {question.text}
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-8">
            <Button
              variant="outline"
              onClick={handlePrevGroup}
              disabled={currentGroupIndex === 0}
              className="px-6"
            >
              Quay lại
            </Button>

            <Button
              onClick={handleNextGroup}
              className="px-8 py-3 bg-education-green hover:bg-education-green/90 text-white"
            >
              {currentGroupIndex === groupTypes.length - 1 ? 'Tiếp theo' : 'Tiếp theo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBlockSelectionStep = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-secondary text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
          <BookOpen className="w-6 h-6" />
          Chọn các khối thi đại học
        </CardTitle>
        <p className="text-white/90">Chọn các khối thi mà bạn dự định tham gia (có thể chọn nhiều)</p>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testBlocks.map(block => (
            <Card
              key={block.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${selectedBlocks.includes(block.id)
                ? 'border-primary bg-primary/10'
                : 'border-muted hover:border-primary'
                }`}
              onClick={() => handleBlockToggle(block.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Checkbox
                    checked={selectedBlocks.includes(block.id)}
                    className="mr-3"
                  />
                  <div className="text-2xl font-bold text-primary">{block.id}</div>
                </div>
                <div className="text-sm text-muted-foreground">{block.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => {
              setStep(2)
              setTimeout(() => {
                if (scrollDivRef.current) {
                  scrollDivRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth', // Cuộn mượt mà
                  });
                }
              }, 100);
            }}
            className="hover:bg-muted"
          >
            Quay lại làm test
          </Button>

          <div className="text-center">
            {selectedBlocks.length > 0 && (
              <p className="text-sm text-muted-foreground mb-2">
                Đã chọn {selectedBlocks.length} khối thi
              </p>
            )}
            <Button
              onClick={handleBlockSelectionNext}
              disabled={selectedBlocks.length === 0}
              className="bg-gradient-primary hover:shadow-glow px-8 py-3"
            >
              Tiếp tục <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const excludedSubjects = [

  ];

  const renderScoreInputStep = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-success text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
          <Target className="w-6 h-6" />
          Điền điểm số của bạn
        </CardTitle>
        <p className="text-white/90">
          Điền điểm hiện tại và điểm mong muốn cho các môn trong khối thi đã chọn
        </p>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-6">
          {scores
            .filter(score => !excludedSubjects.includes(score.subject))
            .map((score, index) => (
              <div key={score.subject} className="bg-muted rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-center">{score.subject}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Điểm hiện tại</Label>
                    <Input
                      min="0"
                      max="10"
                      step="0.1"
                      value={score.currentScore ?? ''}
                      onChange={e => {
                        let value = parseFloat(e.target.value);
                        if (value > 10) value = 10;        // chặn >10
                        if (value < 0) value = 0;          // chặn <0
                        handleScoreChange(index, 'currentScore', value || 0);
                      }}
                      placeholder="0.0"
                      className="h-12 text-base text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Điểm mong muốn</Label>
                    <Input
                      min="0"
                      max="10"
                      step="0.1"
                      value={score.targetScore ?? ''}
                      onChange={e => {
                        let value = parseFloat(e.target.value);
                        if (value > 10) value = 10;
                        if (value < 0) value = 0;
                        handleScoreChange(index, 'targetScore', value || 0);
                      }}
                      placeholder="0.0"
                      className="h-12 text-base text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => {
              setStep(3)
              setTimeout(() => {
                if (scrollDivRef.current) {
                  scrollDivRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth', // Cuộn mượt mà
                  });
                }
              }, 100);
            }}
            className="hover:bg-muted"
          >
            Quay lại chọn khối
          </Button>

          <Button
            onClick={calculateResults}
            disabled={isSubmittingResults}
            className="bg-gradient-primary hover:shadow-glow px-8 py-3"
          >
            {isSubmittingResults ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                Hoàn thành <CheckCircle className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const exportPDF = () => {
    console.log("Generating PDF...");
    if (!pdfRef.current) return;

    const options = {
      margin: 0,
      filename: `KetQuaHolland_${personalInfo.name}_${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },   // scale cao để chữ/ảnh sắc nét
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(options).from(pdfRef.current).save();
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
            Chào {personalInfo.name} - Lớp {personalInfo.class} - Số {personalInfo.number}
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


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Show Holland types details only if no API recommendation text */}
            {/* {!testResult?.recommendationText && ( */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top nhóm Holland của bạn
              </h3>
              <div className="space-y-3">
                {testResult?.topThreeTypes.map((item, index) => (
                  <div key={item.type} className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">#{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {hollandTypeDescriptions[item.type].name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {hollandTypeDescriptions[item.type].description}
                      </div>
                    </div>
                    <Badge className={`bg-education-${hollandTypeDescriptions[item.type].color} text-white`}>
                      {item.score}/10
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
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

            <div>
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
            </div>
          </div>

          {testResult?.scores && testResult.scores.length > 0 && (
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
          className="no-print px-8 py-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="w-5 h-5 mr-2" />
          Xuất PDF
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
      className="h-screen flex flex-col relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${schoolBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* School Header - Fixed */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className={`w-full ${containerMaxWidth} mx-auto`}>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3">
              <img
                src={schoolLogo}
                alt="Logo trường THPT Nguyễn Hiền"
                className="w-12 h-12 md:w-16 md:h-16 object-contain"
              />
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">
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
    </div>
  );
};

export default HollandTest;