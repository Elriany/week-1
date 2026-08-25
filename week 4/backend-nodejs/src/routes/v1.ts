import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';

const v1 = Router();

// One line per feature module. Later stories append here.
v1.use('/health', healthRoutes);
v1.use('/auth', authRoutes);
v1.use('/users', usersRoutes);

export default v1;
