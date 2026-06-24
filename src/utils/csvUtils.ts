import { format, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth } from 'date-fns';

export interface StudentCSVRow {
  stt: string;
  tenThanh: string;
  hoVaTen: string;
  gioiTinh: string;
  ngaySinh: string;
  diaChi: string;
  lop: string;
}

export interface StudentImportData {
  baptism_name: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  address: string;
  class_name: string;
}

// Parse CSV content to array of rows
export function parseCSV(content: string): string[][] {
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Parse date from DD.MM.YYYY or DD/MM/YYYY to YYYY-MM-DD
export function parseDateString(dateStr: string): string {
  const parts = dateStr.split(/[./-]/);
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Parse gender from Vietnamese
export function parseGender(genderStr: string): 'male' | 'female' {
  const lower = genderStr.toLowerCase().trim();
  return lower === 'nữ' || lower === 'nu' || lower === 'n' ? 'female' : 'male';
}

// Parse student data from CSV rows
export function parseStudentCSV(rows: string[][]): StudentImportData[] {
  // Skip header row
  const dataRows = rows.slice(1);
  
  return dataRows.map(row => ({
    baptism_name: row[1] || '',
    name: row[2] || '',
    gender: parseGender(row[3] || 'Nam'),
    birth_date: parseDateString(row[4] || ''),
    address: row[5] || '',
    class_name: row[6] || '',
  })).filter(student => student.name && student.birth_date);
}

// Generate CSV content for students export
export function generateStudentCSV(students: Array<{
  baptism_name: string | null;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  address: string | null;
  class_name: string;
}>): string {
  const header = 'STT,Tên Thánh,Họ và Tên,Giới Tính,Ngày Sinh,Địa Chỉ,Lớp';
  
  const rows = students.map((student, index) => {
    const birthDate = new Date(student.birth_date);
    const formattedDate = format(birthDate, 'dd.MM.yyyy');
    const gender = student.gender === 'female' ? 'Nữ' : 'Nam';
    
    return [
      index + 1,
      student.baptism_name || '',
      student.name,
      gender,
      formattedDate,
      student.address || '',
      student.class_name
    ].map(cell => {
      const str = String(cell);
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

// Get weeks in a month with their Sunday dates
export function getWeeksInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
  
  // Filter to only include Sundays that fall within the month
  return weeks.filter(sunday => {
    return isSameMonth(sunday, start);
  });
}

// Generate attendance report CSV (TL + GL only, no ĐIỂM column)
export function generateAttendanceReportCSV(
  students: Array<{
    id: string;
    baptism_name: string | null;
    name: string;
  }>,
  attendanceRecords: Array<{
    student_id: string;
    date: string;
    status: string;
  }>,
  massRecords: Array<{
    student_id: string;
    date: string;
    attended: boolean;
  }>,
  year: number,
  month: number,
  className: string
): string {
  const sundays = getWeeksInMonth(year, month);
  const monthName = format(new Date(year, month), 'MM/yyyy');
  
  // Build header
  let header = `BẢNG ĐIỂM DANH\nTHÁNG ${monthName}\nLớp: ${className}\n\n`;
  
  // Column headers - only TL and GL
  const columnHeaders = ['TT', 'Tên Thánh', 'Họ và Tên'];
  sundays.forEach((sunday, index) => {
    const sundayLabel = `CN${index + 1}: ${format(sunday, 'dd/MM')}`;
    columnHeaders.push(sundayLabel);
    columnHeaders.push(''); // For GL column
  });
  
  // Sub-headers - only TL and GL (no ĐIỂM)
  const subHeaders = ['', '', ''];
  sundays.forEach(() => {
    subHeaders.push('TL');
    subHeaders.push('GL');
  });
  
  // Build data rows
  const dataRows = students.map((student, index) => {
    const row = [
      String(index + 1),
      student.baptism_name || '',
      student.name
    ];
    
    sundays.forEach(sunday => {
      const sundayStr = format(sunday, 'yyyy-MM-dd');
      
      // TL (Thánh lễ) - Mass attendance
      const massRecord = massRecords.find(
        r => r.student_id === student.id && r.date === sundayStr
      );
      row.push(massRecord ? (massRecord.attended ? 'x' : '') : '');
      
      // GL (Giáo lý) - Catechism attendance
      const attendRecord = attendanceRecords.find(
        r => r.student_id === student.id && r.date === sundayStr
      );
      row.push(attendRecord ? (attendRecord.status === 'present' || attendRecord.status === 'late' ? 'x' : attendRecord.status === 'excused' ? 'p' : '') : '');
    });
    
    return row;
  });
  
  // Combine all rows
  const csvContent = [
    columnHeaders.join(','),
    subHeaders.join(','),
    ...dataRows.map(row => row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');
  
  return header + csvContent;
}

// Download CSV file
export function downloadCSV(content: string, filename: string) {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
