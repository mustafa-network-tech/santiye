export type AttendanceStatus =
  | "worked"
  | "absent"
  | "leave"
  | "medical_report"
  | "weekly_rest";

export type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  is_auto_generated: boolean;
};

export type AttendanceTotals = Record<AttendanceStatus, number>;

export type MonthlyAttendancePersonnel = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  records: AttendanceRecord[];
  totals: AttendanceTotals;
};

export type MonthlyAttendanceData = {
  year: number;
  month: number;
  personnel: MonthlyAttendancePersonnel[];
  active_personnel_ids: string[];
};

export type AttendanceChange = {
  personnel_id: string;
  attendance_date: string;
  status: AttendanceStatus | null;
};

export type PersonnelActivityFilter = "active" | "passive" | "all";
