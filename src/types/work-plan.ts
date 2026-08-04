export type Personnel = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonnelInsert = {
  full_name: string;
  phone?: string | null;
  is_active?: boolean;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type PersonnelUpdate = Partial<PersonnelInsert>;

export type WorkPlanMemberSnapshot = {
  id?: string;
  personnel_id: string | null;
  full_name: string;
  phone: string | null;
  is_chief: boolean;
  sort_order: number;
};

export type WorkPlanTeamSnapshot = {
  id?: string;
  sort_order: number;
  project_code: string;
  project_name: string;
  team_type: string;
  vehicle_plate: string;
  chief_personnel_id: string | null;
  chief_name: string;
  chief_phone: string;
  members: WorkPlanMemberSnapshot[];
};

export type DailyWorkPlan = {
  id: string;
  plan_date: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyWorkPlanWithTeams = DailyWorkPlan & {
  teams: WorkPlanTeamSnapshot[];
};

export type WorkPlanSearchHit = {
  plan_id: string;
  plan_date: string;
  team_id: string;
  project_code: string;
  project_name: string;
  team_type: string;
  vehicle_plate: string;
  chief_name: string;
  member_names: string[];
};
