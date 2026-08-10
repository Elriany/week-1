import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { Approval, ApprovalCreateRequest, ApprovalsResponseData } from '../models/approval.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/approvals`;

  getApprovals(): Observable<ApiResponse<ApprovalsResponseData>> {
    return this.http.get<ApiResponse<ApprovalsResponseData>>(this.apiUrl);
  }

  createApproval(payload: ApprovalCreateRequest): Observable<ApiResponse<Approval>> {
    return this.http.post<ApiResponse<Approval>>(this.apiUrl, payload);
  }
}
