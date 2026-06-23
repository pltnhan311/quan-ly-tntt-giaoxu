import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCatechists, useCreateCatechist, useUpdateCatechist, useDeleteCatechist, Catechist } from '@/hooks/useCatechists';
import { Plus, Search, Eye, Pencil, Trash2, Phone, Mail, GraduationCap, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Catechists() {
  const { userRole } = useAuth();
  const { data: catechists, isLoading } = useCatechists();
  const createCatechist = useCreateCatechist();
  const updateCatechist = useUpdateCatechist();
  const deleteCatechist = useDeleteCatechist();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCatechist, setSelectedCatechist] = useState<Catechist | null>(null);
  const [editingCatechist, setEditingCatechist] = useState<Catechist | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newCatechist, setNewCatechist] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    baptism_name: '',
    address: ''
  });

  const filteredCatechists = (catechists || []).filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCatechist = async () => {
    if (!newCatechist.name || !newCatechist.email || !newCatechist.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    createCatechist.mutate(newCatechist, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewCatechist({
          name: '',
          email: '',
          phone: '',
          password: '',
          baptism_name: '',
          address: ''
        });
      }
    });
  };

  const handleUpdateCatechist = () => {
    if (!editingCatechist) return;

    updateCatechist.mutate({
      user_id: editingCatechist.user_id,
      name: editingCatechist.name,
      email: editingCatechist.email,
      phone: editingCatechist.phone,
      baptism_name: editingCatechist.baptism_name,
      address: editingCatechist.address,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingCatechist(null);
      }
    });
  };

  const handleDelete = (user_id: string) => {
    deleteCatechist.mutate(user_id);
  };

  const assignedCount = filteredCatechists.filter(c => 
    c.class_catechists && c.class_catechists.length > 0
  ).length;

  const unassignedCount = filteredCatechists.filter(c => 
    !c.class_catechists || c.class_catechists.length === 0
  ).length;

  return (
    <MainLayout 
      title="Quản lý Giáo lý viên" 
      subtitle="Danh sách và thông tin GLV"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <GraduationCap className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng GLV</p>
                <p className="text-2xl font-bold">{catechists?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang phụ trách lớp</p>
                <p className="text-2xl font-bold">{assignedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chưa phân lớp</p>
                <p className="text-2xl font-bold">{unassignedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card variant="flat" className="border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {userRole === 'admin' && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gold" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm GLV
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm Giáo lý viên mới</DialogTitle>
                      <DialogDescription>
                        Tạo tài khoản và thông tin cho giáo lý viên mới
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Họ và tên *</Label>
                        <Input
                          value={newCatechist.name}
                          onChange={(e) => setNewCatechist({ ...newCatechist, name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={newCatechist.email}
                          onChange={(e) => setNewCatechist({ ...newCatechist, email: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mật khẩu *</Label>
                        <Input
                          type="password"
                          value={newCatechist.password}
                          onChange={(e) => setNewCatechist({ ...newCatechist, password: e.target.value })}
                          placeholder="Ít nhất 6 ký tự"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tên Thánh</Label>
                        <Input
                          value={newCatechist.baptism_name}
                          onChange={(e) => setNewCatechist({ ...newCatechist, baptism_name: e.target.value })}
                          placeholder="Tên Thánh"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Số điện thoại</Label>
                        <Input
                          value={newCatechist.phone}
                          onChange={(e) => setNewCatechist({ ...newCatechist, phone: e.target.value })}
                          placeholder="0123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Địa chỉ</Label>
                        <Input
                          value={newCatechist.address}
                          onChange={(e) => setNewCatechist({ ...newCatechist, address: e.target.value })}
                          placeholder="Địa chỉ"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleCreateCatechist} disabled={createCatechist.isPending}>
                        {createCatechist.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          'Tạo tài khoản'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Tìm thấy {filteredCatechists.length} Giáo lý viên
        </p>

        {/* Catechists Table */}
        <Card variant="elevated">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCatechists.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Tên Thánh</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Lớp phụ trách</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatechists.map((catechist, index) => (
                    <TableRow 
                      key={catechist.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium">{catechist.name}</TableCell>
                      <TableCell>{catechist.baptism_name || '-'}</TableCell>
                      <TableCell>{catechist.email || '-'}</TableCell>
                      <TableCell>{catechist.phone || '-'}</TableCell>
                      <TableCell>
                        {catechist.class_catechists && catechist.class_catechists.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {catechist.class_catechists.map(cc => (
                              <Badge key={cc.id} variant="secondary">
                                {cc.classes?.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline">Chưa phân lớp</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedCatechist(catechist);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                           {userRole === 'admin' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingCatechist(catechist);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(catechist.user_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Chưa có giáo lý viên nào</p>
                <p className="text-sm text-muted-foreground">Nhấn "Thêm GLV" để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Catechist Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            {editingCatechist && (
              <>
                <DialogHeader>
                  <DialogTitle>Chỉnh sửa thông tin GLV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Họ và tên *</Label>
                    <Input
                      value={editingCatechist.name}
                      onChange={(e) => setEditingCatechist({ ...editingCatechist, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tên Thánh</Label>
                    <Input
                      value={editingCatechist.baptism_name || ''}
                      onChange={(e) => setEditingCatechist({ ...editingCatechist, baptism_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingCatechist.email || ''}
                      onChange={(e) => setEditingCatechist({ ...editingCatechist, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số điện thoại</Label>
                    <Input
                      value={editingCatechist.phone || ''}
                      onChange={(e) => setEditingCatechist({ ...editingCatechist, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ</Label>
                    <Input
                      value={editingCatechist.address || ''}
                      onChange={(e) => setEditingCatechist({ ...editingCatechist, address: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleUpdateCatechist} disabled={updateCatechist.isPending}>
                    {updateCatechist.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Catechist Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedCatechist && (
              <>
                <DialogHeader>
                  <DialogTitle>Thông tin Giáo lý viên</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent">
                      {selectedCatechist.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedCatechist.baptism_name} {selectedCatechist.name}
                      </h3>
                      <Badge variant="gold">Giáo lý viên</Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {selectedCatechist.email && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedCatechist.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedCatechist.phone && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Số điện thoại</p>
                          <p className="font-medium">{selectedCatechist.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lớp phụ trách</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCatechist.class_catechists && selectedCatechist.class_catechists.length > 0 ? (
                            selectedCatechist.class_catechists.map(cc => (
                              <Badge key={cc.id} variant="secondary">
                                {cc.classes?.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Chưa phân lớp</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
