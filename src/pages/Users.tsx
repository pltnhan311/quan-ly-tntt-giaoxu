import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUsers, useUpdateUserRole, useDeleteUser, AppRole } from "@/hooks/useUsers";
import { Loader2, Trash2, Shield, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const roleLabels: Record<AppRole, string> = {
  admin: "Quản trị viên",
  truong_nganh: "Trưởng Ngành",
  glv: "Giáo lý viên",
  student: "Học viên",
};

const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  truong_nganh: "destructive",
  glv: "secondary",
  student: "outline",
};

const roleOrder: Record<AppRole, number> = {
  admin: 1,
  truong_nganh: 2,
  glv: 3,
  student: 4,
};

export default function Users() {
  const { data: users, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRole.mutate({ userId, newRole });
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const filteredAndSortedUsers = (users || [])
    .filter(user => selectedRoleFilter === "all" || user.role === selectedRoleFilter)
    .sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || "").localeCompare(b.name || "", 'vi');
    });

  return (
    <MainLayout title="Quản lý người dùng">
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-custom-lg sm:p-8">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-gold-foreground shadow-gold">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-gold">Quyền truy cập</p>
            <h2 className="font-heading text-xl font-bold sm:text-2xl">Quản lý người dùng</h2>
            <p className="text-primary-foreground/70">
              Quản lý phân quyền và thông tin người dùng
            </p>
          </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Danh sách người dùng</CardTitle>
                <CardDescription>
                  Xem và thay đổi vai trò của người dùng trong hệ thống
                </CardDescription>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                  <SelectTrigger className="h-11 w-full sm:w-[200px]" aria-label="Lọc theo vai trò">
                    <SelectValue placeholder="Lọc theo vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                    <SelectItem value="truong_nganh">Trưởng Ngành</SelectItem>
                    <SelectItem value="glv">Giáo lý viên</SelectItem>
                    <SelectItem value="student">Học viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAndSortedUsers.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">STT</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email || "—"}</TableCell>
                        <TableCell>{user.phone || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              handleRoleChange(user.user_id, value as AppRole)
                            }
                          >
                            <SelectTrigger className="h-10 w-[160px]" aria-label={`Vai trò của ${user.name}`}>
                              <SelectValue>
                                <Badge variant={roleBadgeVariants[user.role]}>
                                  {roleLabels[user.role]}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  {roleLabels.admin}
                                </div>
                              </SelectItem>
                              <SelectItem value="truong_nganh">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-orange-500" />
                                  {roleLabels.truong_nganh}
                                </div>
                              </SelectItem>
                              <SelectItem value="glv">
                                <div className="flex items-center gap-2">
                                  <UsersIcon className="h-4 w-4" />
                                  {roleLabels.glv}
                                </div>
                              </SelectItem>
                              <SelectItem value="student">
                                {roleLabels.student}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user.user_id)}
                            aria-label={`Xóa người dùng ${user.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {users && users.length > 0 
                  ? "Không tìm thấy người dùng nào phù hợp với vai trò đã chọn"
                  : "Chưa có người dùng nào trong hệ thống"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
