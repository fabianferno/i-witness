import { Router } from 'express';
import healthRouter from './health.js';
import uploadRouter from './upload.js';
import synapseRouter from './synapse.js';

const router = Router();

// Health check route
router.use('/health', healthRouter);

// Synapse/Filecoin storage routes
router.use('/synapse', synapseRouter);

// Upload routes
router.use('/upload', uploadRouter);

export default router;

