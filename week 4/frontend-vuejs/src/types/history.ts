export interface ApprovalHistory {
  id: number;
  requestId: number;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedBy: number;
  performerFirstName?: string;
  performerLastName?: string;
  performerEmail?: string;
  performerRole?: string;
  comment?: string | null;
  requestNumber?: string;
  requestTitle?: string;
  createdAt: string;
}
