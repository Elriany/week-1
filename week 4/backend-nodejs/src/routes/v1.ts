import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import customersRoutes from '../modules/customers/customers.routes';
import ticketsRoutes from '../modules/tickets/tickets.routes';
import slaRoutes from '../modules/sla/sla.routes';
import kbRoutes from '../modules/kb/kb.routes';
import portalRoutes from '../modules/portal/portal.routes';
import dashboardRoutes from '../modules/reports/dashboard.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import auditRoutes from '../modules/audit/audit.routes';
import adminRoutes from '../modules/admin/admin.routes';

const v1 = Router();

// One line per feature module. Later stories append here.
v1.use('/health', healthRoutes);
v1.use('/auth', authRoutes);
v1.use('/users', usersRoutes);
v1.use('/customers', customersRoutes);
v1.use('/tickets', ticketsRoutes);
v1.use('/sla', slaRoutes);
v1.use('/kb', kbRoutes);
v1.use('/portal', portalRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/reports', reportsRoutes);
v1.use('/audit', auditRoutes);
v1.use('/admin', adminRoutes);

export default v1;
