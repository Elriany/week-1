import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ApprovalListComponent } from './components/approval-list/approval-list.component';
import { ApprovalCreateComponent } from './components/approval-create/approval-create.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'approvals', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'approvals', component: ApprovalListComponent, canActivate: [authGuard] },
  { path: 'approvals/create', component: ApprovalCreateComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'approvals' }
];
