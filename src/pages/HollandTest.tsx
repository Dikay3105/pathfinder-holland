import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { testBlocks, hollandQuestions, hollandTypeDescriptions, Major, majorsData } from '@/data/testData';
import { BookOpen, GraduationCap, CheckCircle, BarChart3, Sparkles, ArrowRight, Target } from 'lucide-react';
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

interface ScoreInput {
  subject: string;
  currentScore: number;
  targetScore: number;
}

interface TestResult {
  topThreeTypes: Array<{ type: keyof HollandScores; score: number }>;
  compatibleMajors: Major[];
  selectedBlocks: string[];
  scores: ScoreInput[];
}

const HollandTest = () => {
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: '', class: '' });
  const [testAnswers, setTestAnswers] = useState<TestAnswers>({});
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [scores, setScores] = useState<ScoreInput[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

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
  };

  const handleScoreChange = (index: number, field: 'currentScore' | 'targetScore', value: number) => {
    setScores(prev => prev.map((score, i) => 
      i === index ? { ...score, [field]: value } : score
    ));
  };

  const calculateResults = () => {
    const hollandScores: HollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    
    Object.entries(testAnswers).forEach(([questionId, isAnswered]) => {
      if (isAnswered) {
        const question = hollandQuestions.find(q => q.id === parseInt(questionId));
        if (question) {
          hollandScores[question.type]++;
        }
      }
    });

    const sortedTypes = Object.entries(hollandScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, score]) => ({ type: type as keyof HollandScores, score }));

    const userHollandTypes = sortedTypes.map(item => item.type);
    
    // Find compatible majors in selected blocks
    const compatibleMajors = majorsData.filter(major => {
      const hasMatchingBlock = major.examBlocks.some(block => selectedBlocks.includes(block));
      const hasMatchingHollandType = major.hollandTypes.some(type => userHollandTypes.includes(type as keyof HollandScores));
      return hasMatchingBlock && hasMatchingHollandType;
    });

    const result: TestResult = {
      topThreeTypes: sortedTypes,
      compatibleMajors,
      selectedBlocks,
      scores
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
    setTestAnswers({});
    setSelectedBlocks([]);
    setScores([]);
    setTestResult(null);
  };

  // Group questions by Holland type for the test step
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const groupedQuestions = hollandQuestions.reduce((groups, question) => {
    if (!groups[question.type]) {
      groups[question.type] = [];
    }
    groups[question.type].push(question);
    return groups;
  }, {} as Record<string, typeof hollandQuestions>);

  const groupTypes = Object.keys(groupedQuestions);
  const currentGroup = groupTypes[currentGroupIndex];
  const currentQuestions = groupedQuestions[currentGroup] || [];

  const handleNextGroup = () => {
    if (currentGroupIndex < groupTypes.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
    } else {
      setStep(3);
    }
  };

  const handlePrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
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

  const renderTestStep = () => {
    const groupInfo = hollandTypeDescriptions[currentGroup as keyof HollandScores];
    
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-medium">
        <CardHeader className="bg-gradient-warm text-white rounded-t-lg relative">
          <div className="absolute top-4 right-6 text-white/80 font-medium">
            {currentGroupIndex + 1} / {groupTypes.length}
          </div>
          <CardTitle className="text-2xl font-bold text-center pt-2">
            Đánh giá nhóm kỹ năng: {groupInfo?.name}
          </CardTitle>
          <p className="text-white/90 text-sm text-center mt-2">
            {groupInfo?.description}
          </p>
          <p className="text-white/80 text-xs text-center mt-2">
            (Chọn những hoạt động bạn thích)
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-4">
            {currentQuestions.map((question) => (
              <div 
                key={question.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  testAnswers[question.id] 
                    ? 'bg-education-green text-white border-education-green' 
                    : 'border-muted bg-background hover:bg-muted/50'
                }`}
                onClick={() => handleAnswerChange(question.id, !testAnswers[question.id])}
              >
                <div className="flex items-center space-x-4">
                  <Checkbox
                    id={`question-${question.id}`}
                    checked={testAnswers[question.id] || false}
                    onCheckedChange={(checked) => 
                      handleAnswerChange(question.id, checked as boolean)
                    }
                    className="pointer-events-none"
                  />
                  <Label 
                    htmlFor={`question-${question.id}`}
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
              className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                selectedBlocks.includes(block.id) 
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
            onClick={() => setStep(2)}
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
          {scores.map((score, index) => (
            <div key={score.subject} className="bg-muted rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-center">{score.subject}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Điểm hiện tại</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={score.currentScore || ''}
                    onChange={(e) => handleScoreChange(index, 'currentScore', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                    className="h-12 text-base text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Điểm mong muốn</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={score.targetScore || ''}
                    onChange={(e) => handleScoreChange(index, 'targetScore', parseFloat(e.target.value) || 0)}
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
            onClick={() => setStep(3)}
            className="hover:bg-muted"
          >
            Quay lại chọn khối
          </Button>
          
          <Button 
            onClick={calculateResults}
            className="bg-gradient-primary hover:shadow-glow px-8 py-3"
          >
            Hoàn thành <CheckCircle className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderResultStep = () => (
    <div className="w-full max-w-6xl mx-auto space-y-6">
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
              <h3 className="text-xl font-bold mb-4">Ngành học phù hợp</h3>
              <div className="space-y-3">
                {testResult?.compatibleMajors.length ? (
                  testResult.compatibleMajors.slice(0, 5).map(major => (
                    <div key={major.id} className="p-4 bg-education-green/10 border border-education-green/20 rounded-lg">
                      <h4 className="font-bold text-education-green">{major.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{major.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {major.examBlocks.filter(block => testResult.selectedBlocks.includes(block)).map(block => (
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
                      Không tìm thấy ngành học phù hợp hoàn toàn với kết quả Holland và khối thi đã chọn. 
                      Hãy tham khảo thêm ý kiến từ thầy cô hướng nghiệp.
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
                        <div className={`text-sm font-medium ${
                          gap > 0 ? 'text-education-orange' : gap === 0 ? 'text-education-green' : 'text-muted-foreground'
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
        {step === 2 && renderTestStep()}
        {step === 3 && renderBlockSelectionStep()}
        {step === 4 && renderScoreInputStep()}
        {step === 5 && renderResultStep()}
      </div>
    </div>
  );
};

export default HollandTest;