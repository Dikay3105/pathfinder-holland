import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { testBlocks, hollandQuestions, hollandTypeDescriptions, Major } from '@/data/testData';
import { BookOpen, GraduationCap, CheckCircle, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PersonalInfo {
  name: string;
  class: string;
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

interface TestResult {
  topThreeTypes: Array<{ type: keyof HollandScores; score: number }>;
  isCompatible: boolean;
  recommendedSubjects: string[];
}

const HollandTest = () => {
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: '', class: '' });
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [testAnswers, setTestAnswers] = useState<TestAnswers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const selectedBlockData = testBlocks.find(block => block.id === selectedBlock);
  const currentQuestion = hollandQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / hollandQuestions.length) * 100;

  const handlePersonalInfoNext = () => {
    if (!personalInfo.name.trim() || !personalInfo.class.trim()) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Vui lòng điền đầy đủ họ tên và lớp.",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleBlockSelection = (blockId: string) => {
    setSelectedBlock(blockId);
    setSelectedMajor(null);
    setStep(3);
  };

  const handleMajorSelection = (major: Major) => {
    setSelectedMajor(major);
    setStep(4);
  };

  const handleAnswerChange = (questionId: number, checked: boolean) => {
    setTestAnswers(prev => ({
      ...prev,
      [questionId]: checked
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < hollandQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    const scores: HollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    
    Object.entries(testAnswers).forEach(([questionId, isAnswered]) => {
      if (isAnswered) {
        const question = hollandQuestions.find(q => q.id === parseInt(questionId));
        if (question) {
          scores[question.type]++;
        }
      }
    });

    const sortedTypes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, score]) => ({ type: type as keyof HollandScores, score }));

    const userHollandTypes = sortedTypes.map(item => item.type);
    const majorHollandTypes = selectedMajor?.hollandTypes || [];
    
    const isCompatible = userHollandTypes.some(type => majorHollandTypes.includes(type));
    
    const result: TestResult = {
      topThreeTypes: sortedTypes,
      isCompatible,
      recommendedSubjects: selectedMajor?.subjects || []
    };

    setTestResult(result);
    setStep(5);
    
    toast({
      title: "Hoàn thành bài test!",
      description: "Kết quả Holland của bạn đã được tính toán.",
    });
  };

  const resetTest = () => {
    setStep(1);
    setPersonalInfo({ name: '', class: '' });
    setSelectedBlock('');
    setSelectedMajor(null);
    setTestAnswers({});
    setCurrentQuestionIndex(0);
    setTestResult(null);
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
              onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập họ và tên của bạn"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class" className="text-base font-medium">Lớp</Label>
            <Input
              id="class"
              value={personalInfo.class}
              onChange={(e) => setPersonalInfo(prev => ({ ...prev, class: e.target.value }))}
              placeholder="Nhập lớp của bạn (VD: 12A1)"
              className="h-12 text-base"
            />
          </div>
        </div>
        <Button 
          onClick={handlePersonalInfoNext}
          className="w-full h-12 text-base bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          Tiếp tục <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );

  const renderBlockSelectionStep = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-secondary text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
          <BookOpen className="w-6 h-6" />
          Chọn khối thi đại học
        </CardTitle>
        <p className="text-white/90">Chọn khối thi mà bạn dự định tham gia</p>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testBlocks.map(block => (
            <Card 
              key={block.id}
              className="cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-105 border-2 hover:border-primary"
              onClick={() => handleBlockSelection(block.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-primary mb-2">{block.id}</div>
                <div className="text-sm text-muted-foreground mb-3">{block.name}</div>
                <Badge variant="secondary" className="text-xs">
                  {block.majors.length} ngành
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderMajorSelectionStep = () => (
    <Card className="w-full max-w-6xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-success text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
          <Sparkles className="w-6 h-6" />
          Chọn ngành học - {selectedBlockData?.name}
        </CardTitle>
        <p className="text-white/90">Chọn ngành học mà bạn quan tâm trong khối thi này</p>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedBlockData?.majors.map(major => (
            <Card 
              key={major.id}
              className="cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-[1.02] border hover:border-primary"
              onClick={() => handleMajorSelection(major)}
            >
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 text-primary">{major.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{major.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {major.hollandTypes.map(type => (
                    <Badge 
                      key={type} 
                      variant="outline"
                      className={`text-xs border-education-${hollandTypeDescriptions[type as keyof typeof hollandTypeDescriptions]?.color}`}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Môn: {major.subjects.join(', ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => setStep(2)}
            className="hover:bg-muted"
          >
            Quay lại chọn khối thi
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTestStep = () => (
    <Card className="w-full max-w-3xl mx-auto shadow-medium">
      <CardHeader className="bg-gradient-warm text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Bài Test Holland</CardTitle>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {currentQuestionIndex + 1}/{hollandQuestions.length}
          </Badge>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2 bg-white/20" />
          <p className="text-white/90 text-sm">
            Ngành đã chọn: <span className="font-semibold">{selectedMajor?.name}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary text-white text-2xl font-bold mb-4">
              {hollandTypeDescriptions[currentQuestion.type].name.charAt(0)}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {hollandTypeDescriptions[currentQuestion.type].name}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {hollandTypeDescriptions[currentQuestion.type].description}
            </p>
          </div>
          
          <Card className="border-2 border-muted bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Checkbox
                  id={`question-${currentQuestion.id}`}
                  checked={testAnswers[currentQuestion.id] || false}
                  onCheckedChange={(checked) => 
                    handleAnswerChange(currentQuestion.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <Label 
                  htmlFor={`question-${currentQuestion.id}`}
                  className="text-base leading-relaxed cursor-pointer"
                >
                  {currentQuestion.text}
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex-1 mr-3"
            >
              Câu trước
            </Button>
            <Button
              onClick={handleNextQuestion}
              className="flex-1 ml-3 bg-gradient-primary hover:shadow-glow"
            >
              {currentQuestionIndex === hollandQuestions.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderResultStep = () => (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="shadow-medium">
        <CardHeader className="text-center bg-gradient-success text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <CheckCircle className="w-8 h-8" />
            Kết quả Test Holland
          </CardTitle>
          <p className="text-white/90">
            Chào {personalInfo.name} - Lớp {personalInfo.class}
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top 3 nhóm Holland của bạn
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
                      {item.score}/4
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">Đánh giá độ phù hợp</h3>
              <Card className={`border-2 ${testResult?.isCompatible ? 'border-education-green bg-education-green/5' : 'border-education-orange bg-education-orange/5'}`}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`text-4xl mb-3 ${testResult?.isCompatible ? 'text-education-green' : 'text-education-orange'}`}>
                      {testResult?.isCompatible ? '🎉' : '🤔'}
                    </div>
                    <h4 className="font-bold text-lg mb-3">
                      Ngành: {selectedMajor?.name}
                    </h4>
                    <p className={`text-sm mb-4 ${testResult?.isCompatible ? 'text-education-green' : 'text-education-orange'}`}>
                      {testResult?.isCompatible 
                        ? "🎉 Chúc mừng bạn! Kết quả cho thấy ngành này khá phù hợp với năng lực và sở thích của bạn. Tuy nhiên, để biến cơ hội thành hiện thực, hãy tiếp tục tập trung rèn luyện các môn thi đại học – chìa khóa giúp bạn tiến gần hơn đến mục tiêu."
                        : "🤔 Có vẻ ngành bạn chọn chưa thật sự 'ăn khớp' với sở thích và năng lực hiện tại. Bạn có thể trao đổi thêm với thầy cô hướng nghiệp để có góc nhìn rõ hơn. Nhưng quan trọng nhất, hãy tập trung phát huy 2 môn học thế mạnh – đó sẽ là bước đệm chắc chắn để bạn đạt được nguyện vọng."
                      }
                    </p>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Khối thi: {selectedMajor?.examBlocks.join(', ')}</div>
                      <div className="text-sm">Môn trọng tâm: {testResult?.recommendedSubjects.join(', ')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Button 
              onClick={resetTest}
              className="bg-gradient-primary hover:shadow-glow px-8 py-3"
            >
              Làm lại bài test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto">
        {step === 1 && renderPersonalInfoStep()}
        {step === 2 && renderBlockSelectionStep()}
        {step === 3 && renderMajorSelectionStep()}
        {step === 4 && renderTestStep()}
        {step === 5 && renderResultStep()}
      </div>
    </div>
  );
};

export default HollandTest;