import { Router } from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  uploadGalleryImages,
  deleteImage,
  listWebsiteImages,
  uploadWebsiteImage,
  uploadWebsiteImages,
} from '../controllers';
import { authenticate, authorize, uploadSingle, uploadMultiple, uploadSingleMemory, uploadMultipleMemory } from '../middleware';

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

// Upload single image to website public folder
router.post(
  '/website-image',
  authorize('super_admin', 'admin'),
  uploadSingleMemory,
  uploadWebsiteImage
);

// Upload multiple images to website public folder
router.post(
  '/website-images',
  authorize('super_admin', 'admin'),
  uploadMultipleMemory,
  uploadWebsiteImages
);

export default router;
