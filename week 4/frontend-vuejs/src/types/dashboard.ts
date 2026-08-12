import { Role } from './user';
import { ApprovalHistory } from './history';

export interface DashboardData {
  role: Role;
  stats: Record<string, number>;
  recentActivity: ApprovalHistory[];
}
