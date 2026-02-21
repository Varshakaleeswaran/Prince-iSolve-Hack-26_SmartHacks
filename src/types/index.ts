export type UserRole = 'citizen' | 'officer' | 'worker' | 'admin';

export type ComplaintStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export type ComplaintType = 
  | 'pothole' 
  | 'streetlight' 
  | 'illegal_dumping' 
  | 'drainage' 
  | 'road_damage' 
  | 'water_leak' 
  | 'sewage' 
  | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Complaint {
  id: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  citizenId: string;
  citizenName: string;
  officerId?: string;
  workerId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  slaDeadline: Date;
  daysRemaining: number;
  beforeImage?: string;
  afterImage?: string;
  aiVerified?: boolean;
}

export interface KPIData {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  delayed: number;
}

export interface ChartData {
  name: string;
  value: number;
}
