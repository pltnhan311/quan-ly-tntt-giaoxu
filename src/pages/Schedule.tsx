import { useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClasses } from '@/hooks/useClasses';
import { useActiveAcademicYear } from '@/hooks/useAcademicYears';
import { useClassSchedules, useCreateClassSchedule, useCreateParishEvent, useCreateScheduleException, useDeleteClassSchedule, useDeleteParishEvent, useParishEvents, useScheduleExceptions, useUpdateClassSchedule, useUpdateParishEvent } from '@/hooks/useSchedule';

const WEEKDAYS = [
  { value: 1, label: 'Thứ Hai' }, { value: 2, label: 'Thứ Ba' }, { value: 3, label: 'Thứ Tư' },
  { value: 4, label: 'Thứ Năm' }, { value: 5, label: 'Thứ Sáu' }, { value: 6, label: 'Thứ Bảy' },
  { value: 0, label: 'Chúa Nhật' },
];

const toTime = (value: string) => value.slice(0, 5);

export default function Schedule() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [cursor, setCursor] = useState(new Date());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const { data: activeYear } = useActiveAcademicYear();
  const { data: classes, isError: classesError } = useClasses(activeYear?.id);
  const { data: schedules, isLoading: schedulesLoading, isError: schedulesError } = useClassSchedules();
  const { data: events, isError: eventsError } = useParishEvents();
  const { data: exceptions, isError: exceptionsError } = useScheduleExceptions();
  const createSchedule = useCreateClassSchedule();
  const updateSchedule = useUpdateClassSchedule();
  const deleteSchedule = useDeleteClassSchedule();
  const createEvent = useCreateParishEvent();
  const updateEvent = useUpdateParishEvent();
  const deleteEvent = useDeleteParishEvent();
  const createException = useCreateScheduleException();
  const [scheduleForm, setScheduleForm] = useState({ class_id: '', weekday: '0', start_time: '09:00', end_time: '10:30', note: '' });
  const [eventForm, setEventForm] = useState({ title: '', event_date: format(new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', location: '', description: '' });
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ class_id: '', original_date: format(new Date(), 'yyyy-MM-dd'), exception_type: 'cancelled' as 'cancelled' | 'rescheduled', new_date: '', start_time: '09:00', end_time: '10:30', note: '' });

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    return Array.from({ length: endOfMonth(cursor).getDate() }, (_, index) => addDays(startOfMonth(cursor), index));
  }, [cursor, view]);

  const shiftCursor = (amount: number) => setCursor(current => view === 'week' ? addDays(current, amount * 7) : addMonths(current, amount));
  const title = view === 'week'
    ? `${format(days[0], 'dd/MM')} – ${format(days[6], 'dd/MM/yyyy')}`
    : format(cursor, 'MMMM yyyy', { locale: vi });

  const getDayItems = (day: Date) => {
    const recurring = (schedules || [])
      .filter(schedule => schedule.weekday === day.getDay() && !(exceptions || []).some(exception => exception.class_id === schedule.class_id && exception.original_date === format(day, 'yyyy-MM-dd')))
      .map(schedule => ({ kind: 'class' as const, id: schedule.id, title: schedule.classes?.name || 'Chi đoàn', start: toTime(schedule.start_time), end: toTime(schedule.end_time), note: schedule.note }));
    const special = (events || [])
      .filter(event => isSameDay(new Date(`${event.event_date}T00:00:00`), day))
      .map(event => ({ kind: 'event' as const, id: event.id, title: event.title, start: event.start_time ? toTime(event.start_time) : '', end: event.end_time ? toTime(event.end_time) : '', note: event.location || event.description }));
    const moved = (exceptions || [])
      .filter(exception => exception.exception_type === 'rescheduled' && exception.new_date === format(day, 'yyyy-MM-dd'))
      .map(exception => ({ kind: 'class' as const, id: exception.id, title: exception.classes?.name || 'Chi đoàn', start: exception.start_time ? toTime(exception.start_time) : '', end: exception.end_time ? toTime(exception.end_time) : '', note: exception.note || 'Đổi lịch' }));
    return [...recurring, ...special, ...moved].sort((a, b) => a.start.localeCompare(b.start));
  };

  const handleCreateSchedule = () => {
    if (!scheduleForm.class_id) return;
    const onSuccess = () => { setScheduleOpen(false); setEditingScheduleId(null); setScheduleForm(form => ({ ...form, class_id: '', note: '' })); };
    if (editingScheduleId) updateSchedule.mutate({ id: editingScheduleId, ...scheduleForm, weekday: Number(scheduleForm.weekday) }, { onSuccess });
    else createSchedule.mutate({ ...scheduleForm, weekday: Number(scheduleForm.weekday) }, { onSuccess });
  };

  const handleCreateEvent = () => {
    if (!eventForm.title || !eventForm.event_date) return;
    const onSuccess = () => { setEventOpen(false); setEditingEventId(null); setEventForm(form => ({ ...form, title: '', description: '', location: '' })); };
    if (editingEventId) updateEvent.mutate({ id: editingEventId, ...eventForm }, { onSuccess });
    else createEvent.mutate(eventForm, { onSuccess });
  };

  const handleCreateException = () => {
    if (!exceptionForm.class_id || !exceptionForm.original_date) return;
    createException.mutate({ ...exceptionForm, new_date: exceptionForm.exception_type === 'rescheduled' ? exceptionForm.new_date : null, start_time: exceptionForm.exception_type === 'rescheduled' ? exceptionForm.start_time : null, end_time: exceptionForm.exception_type === 'rescheduled' ? exceptionForm.end_time : null }, { onSuccess: () => setExceptionOpen(false) });
  };

  return (
    <MainLayout title="Lịch sinh hoạt" subtitle="Theo dõi lịch chi đoàn và các sự kiện chung">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftCursor(-1)} aria-label="Khoảng thời gian trước"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date())} aria-label="Về hôm nay"><CalendarDays className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => shiftCursor(1)} aria-label="Khoảng thời gian sau"><ChevronRight className="h-4 w-4" /></Button>
            <h2 className="ml-2 font-heading text-lg font-semibold capitalize">{title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tabs value={view} onValueChange={(value) => setView(value as 'week' | 'month')}>
              <TabsList><TabsTrigger value="week">Tuần</TabsTrigger><TabsTrigger value="month">Tháng</TabsTrigger></TabsList>
            </Tabs>
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild><Button variant="outline" onClick={() => setEditingScheduleId(null)}><Plus className="mr-2 h-4 w-4" />Lịch chi đoàn</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingScheduleId ? 'Sửa lịch sinh hoạt' : 'Thêm lịch sinh hoạt định kỳ'}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-3">
                  <div className="space-y-2"><Label>Chi đoàn</Label><Select value={scheduleForm.class_id} onValueChange={value => setScheduleForm({ ...scheduleForm, class_id: value })}><SelectTrigger><SelectValue placeholder="Chọn chi đoàn" /></SelectTrigger><SelectContent>{(classes || []).map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Ngày trong tuần</Label><Select value={scheduleForm.weekday} onValueChange={value => setScheduleForm({ ...scheduleForm, weekday: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WEEKDAYS.map(day => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Bắt đầu</Label><Input type="time" value={scheduleForm.start_time} onChange={event => setScheduleForm({ ...scheduleForm, start_time: event.target.value })} /></div><div className="space-y-2"><Label>Kết thúc</Label><Input type="time" value={scheduleForm.end_time} onChange={event => setScheduleForm({ ...scheduleForm, end_time: event.target.value })} /></div></div>
                  <div className="space-y-2"><Label>Ghi chú</Label><Input value={scheduleForm.note} onChange={event => setScheduleForm({ ...scheduleForm, note: event.target.value })} placeholder="Ví dụ: Phòng giáo lý số 2" /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setScheduleOpen(false)}>Hủy</Button><Button onClick={handleCreateSchedule} disabled={createSchedule.isPending || updateSchedule.isPending}>{(createSchedule.isPending || updateSchedule.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu lịch</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={eventOpen} onOpenChange={setEventOpen}>
              <DialogTrigger asChild><Button variant="gold" onClick={() => setEditingEventId(null)}><Plus className="mr-2 h-4 w-4" />Sự kiện chung</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingEventId ? 'Sửa sự kiện chung' : 'Thêm sự kiện chung'}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-3"><div className="space-y-2"><Label>Tên sự kiện</Label><Input value={eventForm.title} onChange={event => setEventForm({ ...eventForm, title: event.target.value })} placeholder="Ví dụ: Thánh lễ khai giảng" /></div><div className="space-y-2"><Label>Ngày</Label><Input type="date" value={eventForm.event_date} onChange={event => setEventForm({ ...eventForm, event_date: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Bắt đầu</Label><Input type="time" value={eventForm.start_time} onChange={event => setEventForm({ ...eventForm, start_time: event.target.value })} /></div><div className="space-y-2"><Label>Kết thúc</Label><Input type="time" value={eventForm.end_time} onChange={event => setEventForm({ ...eventForm, end_time: event.target.value })} /></div></div><div className="space-y-2"><Label>Địa điểm</Label><Input value={eventForm.location} onChange={event => setEventForm({ ...eventForm, location: event.target.value })} placeholder="Nhà thờ Xóm Chiếu" /></div></div>
                <DialogFooter><Button variant="outline" onClick={() => setEventOpen(false)}>Hủy</Button><Button onClick={handleCreateEvent} disabled={createEvent.isPending || updateEvent.isPending}>{(createEvent.isPending || updateEvent.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu sự kiện</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={exceptionOpen} onOpenChange={setExceptionOpen}>
              <DialogTrigger asChild><Button variant="outline">Nghỉ / đổi lịch</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nghỉ hoặc đổi lịch chi đoàn</DialogTitle></DialogHeader>
                <div className="space-y-4 py-3"><div className="space-y-2"><Label>Chi đoàn</Label><Select value={exceptionForm.class_id} onValueChange={value => setExceptionForm({ ...exceptionForm, class_id: value })}><SelectTrigger><SelectValue placeholder="Chọn chi đoàn" /></SelectTrigger><SelectContent>{(classes || []).map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Ngày lịch cũ</Label><Input type="date" value={exceptionForm.original_date} onChange={event => setExceptionForm({ ...exceptionForm, original_date: event.target.value })} /></div><div className="space-y-2"><Label>Xử lý</Label><Select value={exceptionForm.exception_type} onValueChange={(value: 'cancelled' | 'rescheduled') => setExceptionForm({ ...exceptionForm, exception_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cancelled">Nghỉ sinh hoạt</SelectItem><SelectItem value="rescheduled">Đổi sang ngày khác</SelectItem></SelectContent></Select></div>{exceptionForm.exception_type === 'rescheduled' && <><div className="space-y-2"><Label>Ngày mới</Label><Input type="date" value={exceptionForm.new_date} onChange={event => setExceptionForm({ ...exceptionForm, new_date: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Bắt đầu</Label><Input type="time" value={exceptionForm.start_time} onChange={event => setExceptionForm({ ...exceptionForm, start_time: event.target.value })} /></div><div className="space-y-2"><Label>Kết thúc</Label><Input type="time" value={exceptionForm.end_time} onChange={event => setExceptionForm({ ...exceptionForm, end_time: event.target.value })} /></div></div></>}<div className="space-y-2"><Label>Ghi chú</Label><Input value={exceptionForm.note} onChange={event => setExceptionForm({ ...exceptionForm, note: event.target.value })} placeholder="Lý do hoặc địa điểm mới" /></div></div>
                <DialogFooter><Button variant="outline" onClick={() => setExceptionOpen(false)}>Hủy</Button><Button onClick={handleCreateException} disabled={createException.isPending}>{createException.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu thay đổi</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {(classesError || schedulesError || eventsError || exceptionsError) && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-5">
              <p className="font-medium text-destructive">Không thể tải dữ liệu lịch.</p>
              <p className="mt-1 text-sm text-muted-foreground">Hãy kiểm tra migration lịch trên Supabase rồi tải lại trang.</p>
            </CardContent>
          </Card>
        )}

        {schedulesLoading ? <Card><CardContent className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card> : view === 'week' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {days.map(day => <DayCard key={day.toISOString()} day={day} items={getDayItems(day)} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{days.map(day => <DayCard key={day.toISOString()} day={day} items={getDayItems(day)} compact />)}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Lịch định kỳ</CardTitle></CardHeader>
            <CardContent>{schedules?.length ? <div className="space-y-2">{schedules.map(schedule => <div key={schedule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{schedule.classes?.name}</p><p className="text-xs text-muted-foreground">{WEEKDAYS.find(day => day.value === schedule.weekday)?.label} · {toTime(schedule.start_time)} – {toTime(schedule.end_time)}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingScheduleId(schedule.id); setScheduleForm({ class_id: schedule.class_id, weekday: String(schedule.weekday), start_time: toTime(schedule.start_time), end_time: toTime(schedule.end_time), note: schedule.note || '' }); setScheduleOpen(true); }}>Sửa</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm('Xóa lịch định kỳ này?')) deleteSchedule.mutate(schedule.id); }}>Xóa</Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">Chưa có lịch định kỳ.</p>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Sự kiện chung</CardTitle></CardHeader>
            <CardContent>{events?.length ? <div className="space-y-2">{events.map(event => <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{format(new Date(`${event.event_date}T00:00:00`), 'dd/MM/yyyy')}{event.start_time && ` · ${toTime(event.start_time)}`}{event.location && ` · ${event.location}`}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingEventId(event.id); setEventForm({ title: event.title, event_date: event.event_date, start_time: event.start_time ? toTime(event.start_time) : '', end_time: event.end_time ? toTime(event.end_time) : '', location: event.location || '', description: event.description || '' }); setEventOpen(true); }}>Sửa</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm('Xóa sự kiện này?')) deleteEvent.mutate(event.id); }}>Xóa</Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">Chưa có sự kiện chung.</p>}</CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function DayCard({ day, items, compact = false }: { day: Date; items: Array<{ kind: 'class' | 'event'; id: string; title: string; start: string; end: string; note?: string | null }>; compact?: boolean }) {
  return <Card className={isSameDay(day, new Date()) ? 'border-accent/50 bg-accent/5' : ''}><CardHeader className={compact ? 'p-4 pb-2' : 'pb-3'}><CardTitle className="flex items-center justify-between text-sm"><span>{format(day, 'EEEE', { locale: vi })}</span><span className="text-muted-foreground">{format(day, 'dd/MM')}</span></CardTitle></CardHeader><CardContent className={compact ? 'p-4 pt-1' : 'pt-0'}>{items.length ? <div className="space-y-2">{items.map(item => <div key={`${item.kind}-${item.id}`} className={`rounded-lg border px-3 py-2 ${item.kind === 'event' ? 'border-accent/30 bg-accent/10' : 'bg-background/60'}`}><p className="font-medium leading-5">{item.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{item.start}{item.end && ` – ${item.end}`}</p>{item.note && <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{item.note}</p>}</div>)}</div> : <p className="py-2 text-xs text-muted-foreground">Không có lịch</p>}</CardContent></Card>;
}
