import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
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
  Plus, 
  Edit, 
  Trash2, 
  HelpCircle,
  Filter
} from 'lucide-react';
import { adminApiService, HollandQuestion } from '@/services/adminApi';
import { useToast } from '@/hooks/use-toast';

const HollandQuestions = () => {
  const [questions, setQuestions] = useState<HollandQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<HollandQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<HollandQuestion | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    id: '',
    text: '',
    type: '' as 'R' | 'I' | 'A' | 'S' | 'E' | 'C' | ''
  });
  const { toast } = useToast();

  const hollandTypes = [
    { value: 'R', label: 'Realistic (Kỹ thuật, thực tế)', color: 'bg-blue-500' },
    { value: 'I', label: 'Investigative (Nghiên cứu)', color: 'bg-purple-500' },
    { value: 'A', label: 'Artistic (Nghệ thuật)', color: 'bg-pink-500' },
    { value: 'S', label: 'Social (Xã hội)', color: 'bg-green-500' },
    { value: 'E', label: 'Enterprising (Quản lý)', color: 'bg-orange-500' },
    { value: 'C', label: 'Conventional (Nguyên tắc)', color: 'bg-red-500' }
  ];

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredQuestions(questions);
    } else {
      setFilteredQuestions(questions.filter(q => q.type === filterType));
    }
  }, [questions, filterType]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await adminApiService.getHollandQuestions();
      setQuestions(data);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách câu hỏi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (question?: HollandQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        id: question.id.toString(),
        text: question.text,
        type: question.type
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        id: '',
        text: '',
        type: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingQuestion(null);
    setFormData({
      id: '',
      text: '',
      type: ''
    });
  };

  const handleSave = async () => {
    if (!formData.type || !formData.text) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive'
      });
      return;
    }

    try {
      const questionData = {
        id: parseInt(formData.id) || Date.now(),
        text: formData.text,
        type: formData.type as 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
      };

      if (editingQuestion) {
        await adminApiService.updateHollandQuestion(editingQuestion.id, questionData);
        toast({
          title: 'Thành công',
          description: 'Cập nhật câu hỏi thành công'
        });
      } else {
        await adminApiService.createHollandQuestion(questionData);
        toast({
          title: 'Thành công',
          description: 'Tạo câu hỏi mới thành công'
        });
      }

      handleCloseDialog();
      fetchQuestions();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: editingQuestion ? 'Không thể cập nhật câu hỏi' : 'Không thể tạo câu hỏi mới',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (question: HollandQuestion) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa câu hỏi "${question.text.substring(0, 50)}..."?`)) {
      try {
        await adminApiService.deleteHollandQuestion(question.id);
        toast({
          title: 'Thành công',
          description: 'Xóa câu hỏi thành công'
        });
        fetchQuestions();
      } catch (error) {
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa câu hỏi',
          variant: 'destructive'
        });
      }
    }
  };

  const getTypeInfo = (type: string) => {
    return hollandTypes.find(t => t.value === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 animate-spin mx-auto mb-4" />
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
                <h1 className="text-2xl font-bold text-foreground">Quản lý Câu hỏi Holland</h1>
                <p className="text-muted-foreground">Thêm, sửa, xóa câu hỏi cho từng nhóm Holland</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm câu hỏi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="id">ID câu hỏi</Label>
                    <Input
                      id="id"
                      type="number"
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="ID tự động nếu để trống"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Nhóm Holland</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhóm Holland" />
                      </SelectTrigger>
                      <SelectContent>
                        {hollandTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="text">Nội dung câu hỏi</Label>
                    <Textarea
                      id="text"
                      value={formData.text}
                      onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Nhập nội dung câu hỏi..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>
                    {editingQuestion ? 'Cập nhật' : 'Tạo mới'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Lọc theo nhóm Holland</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
              >
                Tất cả ({questions.length})
              </Button>
              {hollandTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={filterType === type.value ? 'default' : 'outline'}
                  onClick={() => setFilterType(type.value)}
                >
                  <div className={`w-3 h-3 rounded-full ${type.color} mr-2`}></div>
                  {type.value} ({questions.filter(q => q.type === type.value).length})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách câu hỏi ({filteredQuestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Nội dung câu hỏi</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => {
                  const typeInfo = getTypeInfo(question.type);
                  return (
                    <TableRow key={question._id}>
                      <TableCell className="font-medium">{question.id}</TableCell>
                      <TableCell>
                        {typeInfo && (
                          <Badge className={`${typeInfo.color} text-white`}>
                            {question.type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{question.text}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(question)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HollandQuestions;