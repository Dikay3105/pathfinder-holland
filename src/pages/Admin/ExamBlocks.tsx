import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  BookOpen
} from 'lucide-react';
import { adminApiService, ExamBlock } from '@/services/adminApi';
import { useToast } from '@/hooks/use-toast';

const ExamBlocks = () => {
  const [examBlocks, setExamBlocks] = useState<ExamBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ExamBlock | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    subjects: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExamBlocks();
  }, []);

  const fetchExamBlocks = async () => {
    try {
      setLoading(true);
      const data = await adminApiService.getExamBlocks();
      setExamBlocks(data);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách khối thi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (block?: ExamBlock) => {
    if (block) {
      setEditingBlock(block);
      setFormData({
        id: block.id,
        name: block.name,
        subjects: block.subjects.join(', '),
        description: block.description || ''
      });
    } else {
      setEditingBlock(null);
      setFormData({
        id: '',
        name: '',
        subjects: '',
        description: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBlock(null);
    setFormData({
      id: '',
      name: '',
      subjects: '',
      description: ''
    });
  };

  const handleSave = async () => {
    try {
      const examBlockData = {
        id: formData.id,
        name: formData.name,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(s => s),
        description: formData.description
      };

      if (editingBlock) {
        await adminApiService.updateExamBlock(editingBlock._id!, examBlockData);
        toast({
          title: 'Thành công',
          description: 'Cập nhật khối thi thành công'
        });
      } else {
        await adminApiService.createExamBlock(examBlockData);
        toast({
          title: 'Thành công',
          description: 'Tạo khối thi mới thành công'
        });
      }

      handleCloseDialog();
      fetchExamBlocks();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: editingBlock ? 'Không thể cập nhật khối thi' : 'Không thể tạo khối thi mới',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (block: ExamBlock) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khối thi "${block.name}"?`)) {
      try {
        await adminApiService.deleteExamBlock(block._id!);
        toast({
          title: 'Thành công',
          description: 'Xóa khối thi thành công'
        });
        fetchExamBlocks();
      } catch (error) {
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa khối thi',
          variant: 'destructive'
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-spin mx-auto mb-4" />
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
                <h1 className="text-2xl font-bold text-foreground">Quản lý Khối thi</h1>
                <p className="text-muted-foreground">Thêm, sửa, xóa các khối thi và môn học</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm khối thi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBlock ? 'Sửa khối thi' : 'Thêm khối thi mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="id">Mã khối thi</Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="VD: A00, B00, C00..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Tên khối thi</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Khối A00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subjects">Các môn thi (phân cách bằng dấu phẩy)</Label>
                    <Input
                      id="subjects"
                      value={formData.subjects}
                      onChange={(e) => setFormData(prev => ({ ...prev, subjects: e.target.value }))}
                      placeholder="VD: Toán, Lý, Hóa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mô tả về khối thi..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>
                    {editingBlock ? 'Cập nhật' : 'Tạo mới'}
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
            <CardTitle>Danh sách khối thi ({examBlocks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã khối</TableHead>
                  <TableHead>Môn thi</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examBlocks.map((block) => (
                  <TableRow key={block._id}>
                    <TableCell className="font-medium">{block.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {block.subjects.map((subject) => (
                          <Badge key={subject} variant="secondary">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(block)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(block)}
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

export default ExamBlocks;