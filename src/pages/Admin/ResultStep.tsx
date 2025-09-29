// ResultPDF.tsx
import React, { forwardRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge'; import { BarChart3, CheckCircle, Sparkles, Target } from 'lucide-react';
import { hollandTypeDescriptions } from '@/data/testData';
import { apiService, QuestionResponse, SubmitResultRequest, ResultResponse } from '@/services/api';
import { Button } from '@/components/ui/button';

interface PersonalInfo {
  name: string;
  class: string;
  number: number;
  university?: string;
  major?: string;
}

interface ScoreInput {
  subject: string;
  currentScore: number;
  targetScore: number;
}

interface TestResult {
  topThreeTypes: Array<{ type: keyof typeof hollandTypeDescriptions; score: number }>;
  compatibleMajors: any[];
  selectedBlocks: string[];
  scores: ScoreInput[];
  recommendationText?: string;
  advice?: string;
}

interface ResultPDFProps {
  studentId: string;
}

const ResultPDF = forwardRef<HTMLDivElement, ResultPDFProps>(({ studentId }, ref) => {
  const [loading, setLoading] = useState(true);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiService.getStudentById(studentId);
        const s = res.data;

        // sắp xếp nhóm Holland (ví dụ giống code bạn đưa)
        const sorted = Object.entries(s.hollandScores || {})
          .map(([k, v]) => [k as keyof typeof hollandTypeDescriptions, Number(v)])
          .sort((a, b) => b[1] - a[1]);
        const topThree = sorted.slice(0, 3).map(([type, score]) => ({ type, score }));

        setPersonalInfo({
          name: s.name,
          class: s.class,
          number: s.number,
        });
        setTestResult({
          topThreeTypes: topThree,
          compatibleMajors: s.recommendedMajors || [],
          selectedBlocks: s.selectedBlocks || [],
          scores: s.scores || [],
          recommendationText: s.recommendationText,
          advice: s.advice
        });
      } catch (err) {
        console.error('Fetch student failed', err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId)
      fetchData();
  }, [studentId]);

  if (loading) return <div ref={ref}>Đang tải dữ liệu...</div>;
  if (!personalInfo || !testResult) return <div ref={ref}>Không có dữ liệu</div>;

  return (
    <div ref={ref} className="w-full max-w-6xl mx-auto space-y-6" >
      <Card className="shadow-medium">
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
                      <Badge
                        className={`bg-education-${hollandTypeDescriptions[item.type].color} text-white`}
                      >
                        {item.score}/10
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* )} */}

            {testResult?.recommendationText && (
              <div className="card mb-8">
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

          {testResult?.advice && (
            <div className="mt-8 card page-break" >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Lời khuyên dành cho bạn
              </h3>
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                <div className="prose prose-sm max-w-none">
                  <div
                    style={{ pageBreakInside: 'avoid' }}
                    className="text-muted-foreground leading-relaxed whitespace-pre-line card"
                    dangerouslySetInnerHTML={{ __html: testResult.advice }}
                  />
                </div>
              </div>
            </div>
          )}

          {testResult?.scores && testResult.scores.length > 0 && (
            <div className="mt-8 card">
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

    </div>
  );
});



export default ResultPDF;
