import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes';

const v1 = Router();

// One line per feature module. Later stories append here.
v1.use('/health', healthRoutes);

export default v1;
