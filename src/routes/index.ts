import { Router } from 'express';
import authRoutes from './authRoutes';
import websiteRoutes from './websiteRoutes';
import uploadRoutes from './uploadRoutes';
import userRoutes from './userRoutes';
import publicRoutes from './publicRoutes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Public routes (no authentication required)
router.use('/public', publicRoutes);

// Mount routes
router.use('/auth', authRoutes);
router.use('/websites', websiteRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);

export default router;
