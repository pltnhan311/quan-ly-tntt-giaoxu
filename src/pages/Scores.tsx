import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Save, TrendingUp, Award, BookOpen, Loader2, Database, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ScoreEntry {
  studentId: string;
  studentName: string;
  presentation: number | null;
  presentation2: number | null;
  semester1: number | null;
  semester2: number | null;
}

export default function Scores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [scoreType, setScoreType] = useState<'presentation' | 'presentation2' | 'semester1' | 'semester2'>('presentation');
  const [isEditing, setIsEditing] = useState(false);

  const { data: students, isLoading: studentsLoading } = useStudents(selectedClass || undefined);

  const classStudents = students || [];
  const selectedClassInfo = classes?.find(c => c.id === selectedClass);

  // Fetch scores for selected class
  const { data: scoresData, isLoading: scoresLoading } = useQuery({
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

  const getStudentScore = (studentId: string, type: 'presentation' | 'presentation2' | 'semester1' | 'semester2') => {
    const record = (scoresData || []).find(s => s.student_id === studentId && s.type === type);
    return record?.score ?? null;
  };

  const [scores, setScores] = useState<ScoreEntry[]>([]);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!classStudents.length) return;
    setScores(
      classStudents.map(s => ({
        studentId: s.id,
        studentName: s.name,
        presentation: getStudentScore(s.id, 'presentation'),
        presentation2: getStudentScore(s.id, 'presentation2'),
        semester1: getStudentScore(s.id, 'semester1'),
        semester2: getStudentScore(s.id, 'semester2'),
      }))
    );
    setIsEditing(true);
  };

  const handleScoreChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (numValue < 0 || numValue > 10)) {
      toast.error('Điểm phải từ 0 đến 10');
      return;
    }

    setScores(scores =>
      scores.map(s =>
        s.studentId === studentId
          ? { ...s, [scoreType]: numValue }
          : s
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (updatedScores: ScoreEntry[]) => {
      const payload = updatedScores.map(s => {
        let val: number | null = null;
        if (scoreType === 'presentation') val = s.presentation;
        else if (scoreType === 'presentation2') val = s.presentation2;
        else if (scoreType === 'semester1') val = s.semester1;
        else if (scoreType === 'semester2') val = s.semester2;

        return {
          student_id: s.studentId,
          class_id: selectedClass,
          type: scoreType,
          score: val,
          graded_by: user?.id || null,
        };
      });

      const toUpsert = payload.filter(p => p.score !== null) as {
        student_id: string;
        class_id: string;
        type: 'presentation' | 'presentation2' | 'semester1' | 'semester2';
        score: number;
        graded_by: string | null;
      }[];
      const toDeleteStudentIds = payload.filter(p => p.score === null).map(p => p.student_id);

      if (toDeleteStudentIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('scores')
          .delete()
          .eq('class_id', selectedClass)
          .eq('type', scoreType)
          .in('student_id', toDeleteStudentIds);

        if (deleteError) throw deleteError;
      }

      if (toUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('scores')
          .upsert(toUpsert, { onConflict: 'student_id,class_id,type' });

        if (upsertError) throw upsertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', selectedClass] });
      toast.success('Lưu điểm thành công!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error('Error saving scores:', error);
      toast.error('Không thể lưu điểm: ' + error.message);
    }
  });

  const handleSaveScores = () => {
    saveMutation.mutate(scores);
  };

  const getScoreLabel = (type: typeof scoreType) => {
    switch (type) {
      case 'presentation':
        return 'Thuyết trình HK1';
      case 'presentation2':
        return 'Thuyết trình HK2';
      case 'semester1':
        return 'Thi HK1';
      case 'semester2':
        return 'Thi HK2';
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">Chưa có</Badge>;
    if (score >= 8) return <Badge variant="success">{score}</Badge>;
    if (score >= 6.5) return <Badge variant="gold">{score}</Badge>;
    if (score >= 5) return <Badge variant="warning">{score}</Badge>;
    return <Badge variant="destructive">{score}</Badge>;
  };

  const isLoading = classesLoading || (!!selectedClass && (studentsLoading || scoresLoading));

  // Calculate summary stats
  const allScores = scoresData || [];
  const pres1Scores = allScores.filter(s => s.type === 'presentation').map(s => s.score);
  const pres2Scores = allScores.filter(s => s.type === 'presentation2').map(s => s.score);
  const allPresScores = [...pres1Scores, ...pres2Scores];
  const avgPres = allPresScores.length > 0 ? (allPresScores.reduce((sum, s) => sum + s, 0) / allPresScores.length).toFixed(1) : '-';

  const sem1Scores = allScores.filter(s => s.type === 'semester1').map(s => s.score);
  const avgSem1 = sem1Scores.length > 0 ? (sem1Scores.reduce((sum, s) => sum + s, 0) / sem1Scores.length).toFixed(1) : '-';

  const sem2Scores = allScores.filter(s => s.type === 'semester2').map(s => s.score);
  const avgSem2 = sem2Scores.length > 0 ? (sem2Scores.reduce((sum, s) => sum + s, 0) / sem2Scores.length).toFixed(1) : '-';

  // Format student scores for display
  const displayScores = classStudents.map((s) => {
    const pres = getStudentScore(s.id, 'presentation');
    const pres2 = getStudentScore(s.id, 'presentation2');
    const sem1 = getStudentScore(s.id, 'semester1');
    const sem2 = getStudentScore(s.id, 'semester2');
    
    // HK1 Average
    const valuesHK1 = [pres, sem1].filter((v): v is number => v !== null);
    const avgHK1 = valuesHK1.length > 0 ? valuesHK1.reduce((sum, v) => sum + v, 0) / valuesHK1.length : null;
    
    // HK2 Average
    const valuesHK2 = [pres2, sem2].filter((v): v is number => v !== null);
    const avgHK2 = valuesHK2.length > 0 ? valuesHK2.reduce((sum, v) => sum + v, 0) / valuesHK2.length : null;
    
    // Overall Average
    const semesterAverages = [avgHK1, avgHK2].filter((v): v is number => v !== null);
    const overallAvg = semesterAverages.length > 0 ? semesterAverages.reduce((sum, v) => sum + v, 0) / semesterAverages.length : null;

    return {
      studentId: s.id,
      studentName: s.name,
      presentation: pres,
      presentation2: pres2,
      semester1: sem1,
      semester2: sem2,
      average: overallAvg !== null ? Number(overallAvg.toFixed(1)) : null,
    };
  });

  const calculateStudentAvg = (studentId: string, entry: ScoreEntry) => {
    const pres = entry.presentation;
    const pres2 = entry.presentation2;
    const sem1 = entry.semester1;
    const sem2 = entry.semester2;
    
    // HK1 Average
    const valuesHK1 = [pres, sem1].filter((v): v is number => v !== null);
    const avgHK1 = valuesHK1.length > 0 ? valuesHK1.reduce((sum, v) => sum + v, 0) / valuesHK1.length : null;
    
    // HK2 Average
    const valuesHK2 = [pres2, sem2].filter((v): v is number => v !== null);
    const avgHK2 = valuesHK2.length > 0 ? valuesHK2.reduce((sum, v) => sum + v, 0) / valuesHK2.length : null;
    
    // Overall Average
    const semesterAverages = [avgHK1, avgHK2].filter((v): v is number => v !== null);
    const overallAvg = semesterAverages.length > 0 ? semesterAverages.reduce((sum, v) => sum + v, 0) / semesterAverages.length : null;

    return overallAvg !== null ? Number(overallAvg.toFixed(1)) : null;
  };

  return (
    <MainLayout 
      title="Quản lý Điểm số" 
      subtitle="Nhập và quản lý điểm thuyết trình, học kỳ"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Star className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ĐTB Thuyết trình</p>
                <p className="text-2xl font-bold">{avgPres}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ĐTB Thi HK1</p>
                <p className="text-2xl font-bold">{avgSem1}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Award className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ĐTB Thi HK2</p>
                <p className="text-2xl font-bold">{avgSem2}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selection */}
        <Card variant="flat" className="border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="space-y-2 flex-1 max-w-xs">
                <label className="text-sm font-medium">Chọn lớp</label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp để nhập điểm" />
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
              <div className="space-y-2 flex-1 max-w-xs">
                <label className="text-sm font-medium">Loại điểm</label>
                <Select value={scoreType} onValueChange={(v: typeof scoreType) => setScoreType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presentation">Thuyết trình HK1</SelectItem>
                    <SelectItem value="semester1">Thi học kỳ 1</SelectItem>
                    <SelectItem value="presentation2">Thuyết trình HK2</SelectItem>
                    <SelectItem value="semester2">Thi học kỳ 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedClass && classStudents.length > 0 && (
                <>
                  <Button 
                    variant={isEditing ? 'outline' : 'gold'}
                    onClick={() => isEditing ? setIsEditing(false) : startEditing()}
                    disabled={saveMutation.isPending}
                  >
                    {isEditing ? 'Hủy' : 'Nhập điểm'}
                  </Button>
                  {isEditing && (
                    <Button 
                      variant="success" 
                      onClick={handleSaveScores}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Lưu điểm
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scores Table */}
        {!selectedClass ? (
          <Card variant="flat" className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chọn lớp để nhập điểm</h3>
              <p className="text-muted-foreground text-center">
                Vui lòng chọn lớp học từ danh sách phía trên
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : classStudents.length === 0 ? (
          <Card variant="flat" className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lớp chưa có học viên</h3>
              <p className="text-muted-foreground text-center">
                Vui lòng thêm học viên vào lớp trước khi nhập điểm
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bảng điểm - {selectedClassInfo?.name}
              </CardTitle>
              <CardDescription>
                {isEditing ? `Đang nhập ${getScoreLabel(scoreType)}` : 'Xem điểm tổng hợp'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead className="text-center">Thuyết trình HK1</TableHead>
                    <TableHead className="text-center">Thi HK1</TableHead>
                    <TableHead className="text-center">Thuyết trình HK2</TableHead>
                    <TableHead className="text-center">Thi HK2</TableHead>
                    <TableHead className="text-center">ĐTB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing ? scores : displayScores).map((entry, index) => {
                    const rowAvg = isEditing 
                      ? calculateStudentAvg(entry.studentId, entry)
                      : entry.average;

                    return (
                      <TableRow key={entry.studentId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{entry.studentName}</TableCell>
                        <TableCell className="text-center">
                          {isEditing && scoreType === 'presentation' ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20 mx-auto text-center"
                              value={entry.presentation ?? ''}
                              onChange={(e) => handleScoreChange(entry.studentId, e.target.value)}
                            />
                          ) : (
                            getScoreBadge(entry.presentation)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing && scoreType === 'semester1' ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20 mx-auto text-center"
                              value={entry.semester1 ?? ''}
                              onChange={(e) => handleScoreChange(entry.studentId, e.target.value)}
                            />
                          ) : (
                            getScoreBadge(entry.semester1)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing && scoreType === 'presentation2' ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20 mx-auto text-center"
                              value={entry.presentation2 ?? ''}
                              onChange={(e) => handleScoreChange(entry.studentId, e.target.value)}
                            />
                          ) : (
                            getScoreBadge(entry.presentation2)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing && scoreType === 'semester2' ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20 mx-auto text-center"
                              value={entry.semester2 ?? ''}
                              onChange={(e) => handleScoreChange(entry.studentId, e.target.value)}
                            />
                          ) : (
                            getScoreBadge(entry.semester2)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getScoreBadge(rowAvg)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
