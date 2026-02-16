import { Router } from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  uploadGalleryImages,
  deleteImage,
  listWebsiteImages,
} from '../controllers';
import { authenticate, authorize, uploadSingle, uploadMultiple } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload single image
router.post(
  '/image',
  authorize('super_admin', 'admin', 'content_manager'),
  uploadSingle,
  uploadImage
);

// Upload multiple images
router.post(
  '/multiple',
  authorize('super_admin', 'admin', 'content_manager'),
  uploadMultiple,
  uploadMultipleImages
);

// Upload gallery images (with resize)
router.post(
  '/gallery',
  authorize('super_admin', 'admin', 'content_manager'),
  uploadMultiple,
  uploadGalleryImages
);

// Delete image
router.delete(
  '/:filename',
  authorize('super_admin', 'admin', 'content_manager'),
  deleteImage
);

// List website images
router.get('/list/:websiteId', listWebsiteImages);

export default router;
