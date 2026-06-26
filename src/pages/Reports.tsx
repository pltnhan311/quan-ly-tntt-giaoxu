import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Church,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: allStudents, isLoading: studentsLoading } = useStudents();
  const [selectedClass, setSelectedClass] = useState<string>('');

  const classStudents = selectedClass 
    ? (allStudents || []).filter(s => s.class_id === selectedClass)
    : [];
  const selectedClassInfo = classes?.find(c => c.id === selectedClass);

  // Fetch attendance records for selected class
  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendance-records', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', selectedClass);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass,
  });

  // Fetch mass attendance for students in class
  const { data: massRecords } = useQuery({
    queryKey: ['mass-attendance', selectedClass, classStudents.map(s => s.id)],
    queryFn: async () => {
      if (!classStudents.length) return [];
      const { data, error } = await supabase
        .from('mass_attendance')
        .select('*')
        .in('student_id', classStudents.map(s => s.id));
      if (error) throw error;
      return data || [];
    },
    enabled: classStudents.length > 0,
  });

  // Fetch scores for selected class
  const { data: scores } = useQuery({
    queryKey: ['scores', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('class_id', selectedClass);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass,
  });

  // Calculate attendance report
  const attendanceReport = classStudents.map(student => {
    const studentRecords = (attendanceRecords || []).filter(r => r.student_id === student.id);
    const totalSessions = studentRecords.length;
    const presentCount = studentRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
    const excusedCount = studentRecords.filter(r => r.status === 'excused').length;
    
    return {
      studentId: student.id,
      name: student.name,
      totalSessions,
      presentCount,
      absentCount,
      excusedCount,
      attendanceRate: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0
    };
  });

  // Calculate mass attendance report
  const massAttendanceReport = classStudents.map(student => {
    const studentMass = (massRecords || []).filter(r => r.student_id === student.id);
    const totalMasses = studentMass.length;
    const attendedCount = studentMass.filter(r => r.attended).length;
    
    return {
      studentId: student.id,
      name: student.name,
      totalMasses,
      attendedCount,
      missedCount: totalMasses - attendedCount,
      attendanceRate: totalMasses > 0 ? Math.round((attendedCount / totalMasses) * 100) : 0
    };
  });

  // Calculate score report
  const scoreReport = classStudents.map(student => {
    const studentScores = (scores || []).filter(s => s.student_id === student.id);
    const pres1 = studentScores.find(s => s.type === 'presentation')?.score ?? null;
    const pres2 = studentScores.find(s => s.type === 'presentation2')?.score ?? null;
    const sem1 = studentScores.find(s => s.type === 'semester1')?.score ?? null;
    const sem2 = studentScores.find(s => s.type === 'semester2')?.score ?? null;
    
    // HK1 Average
    const valuesHK1 = [pres1, sem1].filter((v): v is number => v !== null);
    const avgHK1 = valuesHK1.length > 0 ? valuesHK1.reduce((sum, v) => sum + v, 0) / valuesHK1.length : null;
    
    // HK2 Average
    const valuesHK2 = [pres2, sem2].filter((v): v is number => v !== null);
    const avgHK2 = valuesHK2.length > 0 ? valuesHK2.reduce((sum, v) => sum + v, 0) / valuesHK2.length : null;
    
    // Overall Average
    const semesterAverages = [avgHK1, avgHK2].filter((v): v is number => v !== null);
    const overallAvg = semesterAverages.length > 0 ? semesterAverages.reduce((sum, v) => sum + v, 0) / semesterAverages.length : null;
    
    return {
      studentId: student.id,
      name: student.name,
      presentation: pres1,
      presentation2: pres2,
      semester1: sem1,
      semester2: sem2,
      average: overallAvg !== null ? Number(overallAvg.toFixed(1)) : null
    };
  });

  const handleExport = (type: string) => {
    toast.success(`Đang xuất báo cáo ${type}...`);
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground">-</span>;
    if (score >= 8) return <Badge variant="success">{score}</Badge>;
    if (score >= 6.5) return <Badge variant="gold">{score}</Badge>;
    if (score >= 5) return <Badge variant="warning">{score}</Badge>;
    return <Badge variant="destructive">{score}</Badge>;
  };

  const getAttendanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="success">{rate}%</Badge>;
    if (rate >= 75) return <Badge variant="gold">{rate}%</Badge>;
    if (rate >= 60) return <Badge variant="warning">{rate}%</Badge>;
    return <Badge variant="destructive">{rate}%</Badge>;
  };

  // Calculate summary stats
  const avgAttendance = attendanceReport.length > 0 
    ? Math.round(attendanceReport.reduce((sum, r) => sum + r.attendanceRate, 0) / attendanceReport.length)
    : 0;
  const avgMassAttendance = massAttendanceReport.length > 0
    ? Math.round(massAttendanceReport.reduce((sum, r) => sum + r.attendanceRate, 0) / massAttendanceReport.length)
    : 0;
  const validReportScores = scoreReport.filter((r): r is typeof r & { average: number } => r.average !== null);
  const avgScore = validReportScores.length > 0
    ? (validReportScores.reduce((sum, r) => sum + r.average, 0) / validReportScores.length).toFixed(1)
    : '0';

  const isLoading = classesLoading || studentsLoading;

  return (
    <MainLayout 
      title="Báo cáo" 
      subtitle="Thống kê chuyên cần, điểm danh lễ và điểm số"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card variant="flat" className="border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Chọn lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleExport('Excel')}
                disabled={!selectedClass}
              >
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {!selectedClass ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chọn lớp để xem báo cáo</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card variant="elevated">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                    <Users className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TB Chuyên cần</p>
                    <p className="text-2xl font-bold">{avgAttendance}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Church className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TB Tham dự lễ</p>
                    <p className="text-2xl font-bold">{avgMassAttendance}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="gold">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ĐTB lớp</p>
                    <p className="text-2xl font-bold">{avgScore}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Tabs */}
            <Tabs defaultValue="attendance" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="attendance">Chuyên cần</TabsTrigger>
                <TabsTrigger value="mass">Tham dự lễ</TabsTrigger>
                <TabsTrigger value="scores">Điểm số</TabsTrigger>
              </TabsList>

              {/* Attendance Report */}
              <TabsContent value="attendance">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Báo cáo chuyên cần - {selectedClassInfo?.name}
                    </CardTitle>
                    <CardDescription>
                      Thống kê điểm danh giáo lý
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceReport.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">STT</TableHead>
                            <TableHead>Họ và tên</TableHead>
                            <TableHead className="text-center">Tổng buổi</TableHead>
                            <TableHead className="text-center">Có mặt</TableHead>
                            <TableHead className="text-center">Vắng</TableHead>
                            <TableHead className="text-center">Có phép</TableHead>
                            <TableHead className="text-center">Tỷ lệ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceReport.map((row, index) => (
                            <TableRow key={row.studentId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell className="text-center">{row.totalSessions}</TableCell>
                              <TableCell className="text-center text-success">{row.presentCount}</TableCell>
                              <TableCell className="text-center text-destructive">{row.absentCount}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{row.excusedCount}</TableCell>
                              <TableCell className="text-center">
                                {row.totalSessions > 0 ? getAttendanceBadge(row.attendanceRate) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu điểm danh</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Mass Attendance Report */}
              <TabsContent value="mass">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Church className="h-5 w-5" />
                      Báo cáo tham dự Thánh lễ - {selectedClassInfo?.name}
                    </CardTitle>
                    <CardDescription>
                      Thống kê tham dự Thánh lễ Chúa nhật
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {massAttendanceReport.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">STT</TableHead>
                            <TableHead>Họ và tên</TableHead>
                            <TableHead className="text-center">Tổng lễ</TableHead>
                            <TableHead className="text-center">Tham dự</TableHead>
                            <TableHead className="text-center">Vắng</TableHead>
                            <TableHead className="text-center">Tỷ lệ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {massAttendanceReport.map((row, index) => (
                            <TableRow key={row.studentId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell className="text-center">{row.totalMasses}</TableCell>
                              <TableCell className="text-center text-success">{row.attendedCount}</TableCell>
                              <TableCell className="text-center text-destructive">{row.missedCount}</TableCell>
                              <TableCell className="text-center">
                                {row.totalMasses > 0 ? getAttendanceBadge(row.attendanceRate) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu điểm danh lễ</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Score Report */}
              <TabsContent value="scores">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Báo cáo điểm số - {selectedClassInfo?.name}
                    </CardTitle>
                    <CardDescription>
                      Tổng hợp điểm thuyết trình và học kỳ
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scoreReport.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">STT</TableHead>
                            <TableHead>Họ và tên</TableHead>
                            <TableHead className="text-center">Thuyết trình HK1</TableHead>
                            <TableHead className="text-center">Thi HK1</TableHead>
                            <TableHead className="text-center">Thuyết trình HK2</TableHead>
                            <TableHead className="text-center">Thi HK2</TableHead>
                            <TableHead className="text-center">ĐTB</TableHead>
                            <TableHead className="text-center">Xếp loại</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scoreReport.map((row, index) => (
                            <TableRow key={row.studentId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell className="text-center">{getScoreBadge(row.presentation)}</TableCell>
                              <TableCell className="text-center">{getScoreBadge(row.semester1)}</TableCell>
                              <TableCell className="text-center">{getScoreBadge(row.presentation2)}</TableCell>
                              <TableCell className="text-center">{getScoreBadge(row.semester2)}</TableCell>
                              <TableCell className="text-center">{row.average !== null ? getScoreBadge(row.average) : '-'}</TableCell>
                              <TableCell className="text-center">
                                {row.average !== null ? (
                                  <Badge variant={row.average >= 8 ? 'success' : row.average >= 6.5 ? 'gold' : 'secondary'}>
                                    {row.average >= 8 ? 'Giỏi' : row.average >= 6.5 ? 'Khá' : 'TB'}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu điểm số</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
