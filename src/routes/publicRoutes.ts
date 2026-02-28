import { Router } from 'express';
import { getWebsiteByUniqueId, submitContactMessage } from '../controllers';

const router = Router();

// Public API endpoints - No authentication required
// Get website content by unique ID
router.get('/website/:uniqueId', getWebsiteByUniqueId);

// Submit contact message (public - no auth)
router.post('/website/:websiteId/contact', submitContactMessage);

export default router;
