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
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <UsersIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
            <p className="text-muted-foreground">
              Quản lý phân quyền và thông tin người dùng
            </p>
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
              <div className="flex items-center gap-2">
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                  <SelectTrigger className="w-[180px]">
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.map((user) => (
                      <TableRow key={user.id}>
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
                            <SelectTrigger className="w-[160px]">
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
