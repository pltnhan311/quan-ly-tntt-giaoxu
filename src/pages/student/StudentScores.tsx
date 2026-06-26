import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function StudentScores() {
  const { user } = useAuth();

  // Get student info
  const { data: student } = useQuery({
    queryKey: ['student-scores-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id, name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get all scores
  const { data: scores, isLoading } = useQuery({
    queryKey: ['student-all-scores', student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', student?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!student?.id,
  });

  const getScoreType = (type: string) => {
    switch (type) {
      case 'presentation':
        return { label: 'Thuyết trình HK1', color: 'bg-blue-500' };
      case 'presentation2':
        return { label: 'Thuyết trình HK2', color: 'bg-indigo-500' };
      case 'semester1':
        return { label: 'Thi HK1', color: 'bg-green-500' };
      case 'semester2':
        return { label: 'Thi HK2', color: 'bg-purple-500' };
      default:
        return { label: type, color: 'bg-gray-500' };
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  // Calculate averages
  const getAverageForTypes = (types: string[]) => {
    const filtered = scores?.filter(s => types.includes(s.type)) || [];
    if (filtered.length === 0) return null;
    const total = filtered.reduce((sum, s) => sum + (s.score / s.max_score) * 10, 0);
    return (total / filtered.length).toFixed(1);
  };

  const avgHK1 = getAverageForTypes(['presentation', 'semester1']);
  const avgHK2 = getAverageForTypes(['presentation2', 'semester2']);
  
  const overallAverages = [avgHK1, avgHK2].map(Number).filter(Boolean);
  const avgYear = overallAverages.length > 0 ? (overallAverages.reduce((sum, v) => sum + v, 0) / overallAverages.length).toFixed(1) : null;

  if (!student?.class_id) {
    return (
      <MainLayout title="Điểm số" subtitle="Kết quả học tập">
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có lớp học</h3>
            <p className="text-muted-foreground">
              Bạn chưa được phân vào lớp học nào.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Điểm số" subtitle="Kết quả học tập của bạn">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Điểm HK1 (ĐTB)</span>
              </div>
              <p className="text-3xl font-bold text-blue-500">
                {avgHK1 || '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Thuyết trình HK1 & Thi HK1
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Điểm HK2 (ĐTB)</span>
              </div>
              <p className="text-3xl font-bold text-green-500">
                {avgHK2 || '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Thuyết trình HK2 & Thi HK2
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Điểm cả năm (ĐTB)</span>
              </div>
              <p className="text-3xl font-bold text-purple-500">
                {avgYear || '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Trung bình của 2 học kỳ
              </p>
            </CardContent>
          </Card>
        </div>

        {/* All Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết điểm số</CardTitle>
            <CardDescription>Tất cả điểm số của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scores && scores.length > 0 ? (
              <div className="space-y-3">
                {scores.map((score) => {
                  const typeInfo = getScoreType(score.type);
                  return (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(score.date), 'dd/MM/yyyy', { locale: vi })}
                          </p>
                          {score.note && (
                            <p className="text-xs text-muted-foreground">{score.note}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(score.score, score.max_score)}`}>
                          {score.score}
                        </p>
                        <p className="text-xs text-muted-foreground">/ {score.max_score}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Chưa có điểm số nào
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
