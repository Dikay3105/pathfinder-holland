import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  GraduationCap
} from 'lucide-react';
import { adminApiService, Major, ExamBlock } from '@/services/adminApi';
import { useToast } from '@/hooks/use-toast';

const Majors = () => {
  const [majors, setMajors] = useState<Major[]>([]);
  const [examBlocks, setExamBlocks] = useState<ExamBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    characteristics: '',
    examBlocks: [] as string[],
    hollandTypes: [] as string[]
  });
  const { toast } = useToast();

  const hollandTypes = [
    { value: 'R', label: 'Realistic (Kỹ thuật)', color: 'bg-blue-500' },
    { value: 'I', label: 'Investigative (Nghiên cứu)', color: 'bg-purple-500' },
    { value: 'A', label: 'Artistic (Nghệ thuật)', color: 'bg-pink-500' },
    { value: 'S', label: 'Social (Xã hội)', color: 'bg-green-500' },
    { value: 'E', label: 'Enterprising (Quản lý)', color: 'bg-orange-500' },
    { value: 'C', label: 'Conventional (Nguyên tắc)', color: 'bg-red-500' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [majorsData, examBlocksData] = await Promise.all([
        adminApiService.getMajors(),
        adminApiService.getExamBlocks()
      ]);
      setMajors(majorsData);
      setExamBlocks(examBlocksData);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (major?: Major) => {
    if (major) {
      setEditingMajor(major);
      setFormData({
        name: major.name,
        description: major.description,
        characteristics: major.characteristics || '',
        examBlocks: major.examBlocks,
        hollandTypes: major.hollandTypes
      });
    } else {
      setEditingMajor(null);
      setFormData({
        name: '',
        description: '',
        characteristics: '',
        examBlocks: [],
        hollandTypes: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMajor(null);
    setFormData({
      name: '',
      description: '',
      characteristics: '',
      examBlocks: [],
      hollandTypes: []
    });
  };

  const handleExamBlockChange = (examBlockId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      examBlocks: checked
        ? [...prev.examBlocks, examBlockId]
        : prev.examBlocks.filter(id => id !== examBlockId)
    }));
  };

  const handleHollandTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      hollandTypes: checked
        ? [...prev.hollandTypes, type]
        : prev.hollandTypes.filter(t => t !== type)
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        variant: 'destructive'
      });
      return;
    }

    try {
      const majorData = {
        name: formData.name,
        description: formData.description,
        characteristics: formData.characteristics,
        examBlocks: formData.examBlocks,
        hollandTypes: formData.hollandTypes
      };

      if (editingMajor) {
        await adminApiService.updateMajor(editingMajor._id!, majorData);
        toast({
          title: 'Thành công',
          description: 'Cập nhật ngành học thành công'
        });
      } else {
        await adminApiService.createMajor(majorData);
        toast({
          title: 'Thành công',
          description: 'Tạo ngành học mới thành công'
        });
      }

      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: editingMajor ? 'Không thể cập nhật ngành học' : 'Không thể tạo ngành học mới',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (major: Major) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ngành học "${major.name}"?`)) {
      try {
        await adminApiService.deleteMajor(major._id!);
        toast({
          title: 'Thành công',
          description: 'Xóa ngành học thành công'
        });
        fetchData();
      } catch (error) {
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa ngành học',
          variant: 'destructive'
        });
      }
    }
  };

  const getHollandTypeInfo = (type: string) => {
    return hollandTypes.find(t => t.value === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 animate-spin mx-auto mb-4" />
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
                <h1 className="text-2xl font-bold text-foreground">Quản lý Ngành học</h1>
                <p className="text-muted-foreground">Thêm, sửa, xóa ngành học và cấu hình khối thi, Holland types</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm ngành học
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMajor ? 'Sửa ngành học' : 'Thêm ngành học mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Tên ngành học *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="VD: Công nghệ thông tin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="characteristics">Đặc điểm tiêu biểu</Label>
                      <Input
                        id="characteristics"
                        value={formData.characteristics}
                        onChange={(e) => setFormData(prev => ({ ...prev, characteristics: e.target.value }))}
                        placeholder="VD: Cần tư duy logic, giỏi công nghệ"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Mô tả ngành học *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mô tả chi tiết về ngành học..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Khối thi liên quan</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg">
                      {examBlocks.map((block) => (
                        <div key={block._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`block-${block._id}`}
                            checked={formData.examBlocks.includes(block.id)}
                            onCheckedChange={(checked) => 
                              handleExamBlockChange(block.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`block-${block._id}`}
                            className="text-sm cursor-pointer"
                          >
                            {block.id} - {block.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Nhóm Holland phù hợp</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg">
                      {hollandTypes.map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`holland-${type.value}`}
                            checked={formData.hollandTypes.includes(type.value)}
                            onCheckedChange={(checked) => 
                              handleHollandTypeChange(type.value, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`holland-${type.value}`}
                            className="text-sm cursor-pointer flex items-center space-x-2"
                          >
                            <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                            <span>{type.label}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>
                    {editingMajor ? 'Cập nhật' : 'Tạo mới'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách ngành học ({majors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên ngành</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Khối thi</TableHead>
                  <TableHead>Holland Types</TableHead>
                  <TableHead>Đặc điểm</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {majors.map((major) => (
                  <TableRow key={major._id}>
                    <TableCell className="font-medium">{major.name}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-2">{major.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {major.examBlocks.map((blockId) => (
                          <Badge key={blockId} variant="outline">
                            {blockId}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {major.hollandTypes.map((type) => {
                          const typeInfo = getHollandTypeInfo(type);
                          return (
                            <Badge 
                              key={type} 
                              className={`${typeInfo?.color} text-white text-xs`}
                            >
                              {type}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm line-clamp-2">{major.characteristics}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(major)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(major)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Majors;