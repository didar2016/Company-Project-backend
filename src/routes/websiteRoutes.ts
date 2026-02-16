import { Router } from 'express';
import { body } from 'express-validator';
import {
  getWebsites,
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  switchWebsite,
  assignAdmin,
  getRooms,
  addRoom,
  updateRoom,
  deleteRoom,
  getHeroSections,
  upsertHeroSection,
  deleteHeroSection,
  getSiteSettings,
  updateSiteSettings,
  getOurStory,
  updateOurStory,
  getFacilities,
  addFacility,
  updateFacility,
  deleteFacility,
  getReviews,
  addReview,
  updateReview,
  deleteReview,
} from '../controllers';
import { authenticate, authorize, checkWebsiteAccess } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all websites
router.get('/', getWebsites);

// Get single website
router.get('/:id', checkWebsiteAccess, getWebsite);

// Create website (super_admin only)
router.post(
  '/',
  authorize('super_admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('domain').notEmpty().withMessage('Domain is required'),
  ],
  createWebsite
);

// Update website (includes hotelInfo)
router.put(
  '/:id',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateWebsite
);

// Delete website (super_admin only)
router.delete('/:id', authorize('super_admin'), deleteWebsite);

// Switch active website
router.post('/:id/switch', checkWebsiteAccess, switchWebsite);

// Assign admin to website (super_admin only)
router.patch(
  '/:id/assign-admin',
  authorize('super_admin'),
  [
    body('adminId').optional().isMongoId().withMessage('Invalid admin ID'),
  ],
  assignAdmin
);

// ========================
// Room sub-routes (embedded in website)
// ========================

// Get rooms for a website
router.get('/:websiteId/rooms', checkWebsiteAccess, getRooms);

// Add room to website
router.post(
  '/:websiteId/rooms',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  [
    body('name').notEmpty().withMessage('Room name is required'),
    body('bedType').notEmpty().withMessage('Bed type is required'),
    body('maxOccupancy').isInt({ min: 1 }).withMessage('Max occupancy must be at least 1'),
    body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be non-negative'),
  ],
  addRoom
);

// Update room in website
router.put(
  '/:websiteId/rooms/:roomId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateRoom
);

// Delete room from website
router.delete(
  '/:websiteId/rooms/:roomId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  deleteRoom
);

// ========================
// Hero Section sub-routes (embedded in website)
// ========================

// Get hero sections for a website
router.get('/:websiteId/hero-sections', checkWebsiteAccess, getHeroSections);

// Upsert hero section (create or update by page type)
router.post(
  '/:websiteId/hero-sections',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  [
    body('page').notEmpty().withMessage('Page type is required'),
  ],
  upsertHeroSection
);

// Delete hero section from website
router.delete(
  '/:websiteId/hero-sections/:heroId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  deleteHeroSection
);

// ========================
// Site Settings sub-routes
// ========================

// Get site settings
router.get('/:websiteId/site-settings', checkWebsiteAccess, getSiteSettings);

// Update site settings (logo, footer logo, footer description - all base64)
router.put(
  '/:websiteId/site-settings',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateSiteSettings
);

// ========================
// ========================
// Our Story sub-routes (single embedded object in website)
// ========================

// Get our story
router.get('/:websiteId/our-story', checkWebsiteAccess, getOurStory);

// Update our story
router.put(
  '/:websiteId/our-story',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateOurStory
);

// ========================
// Facilities sub-routes (embedded in website)
// ========================

// Get facilities
router.get('/:websiteId/facilities', checkWebsiteAccess, getFacilities);

// Add facility
router.post(
  '/:websiteId/facilities',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  [
    body('title').notEmpty().withMessage('Title is required'),
  ],
  addFacility
);

// Update facility
router.put(
  '/:websiteId/facilities/:facilityId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateFacility
);

// Delete facility
router.delete(
  '/:websiteId/facilities/:facilityId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  deleteFacility
);

// ========================
// Reviews sub-routes (embedded in website)
// ========================

// Get reviews
router.get('/:websiteId/reviews', checkWebsiteAccess, getReviews);

// Add review
router.post(
  '/:websiteId/reviews',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  [
    body('name').notEmpty().withMessage('Reviewer name is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  ],
  addReview
);

// Update review
router.put(
  '/:websiteId/reviews/:reviewId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  updateReview
);

// Delete review
router.delete(
  '/:websiteId/reviews/:reviewId',
  authorize('super_admin', 'admin'),
  checkWebsiteAccess,
  deleteReview
);

export default router;
