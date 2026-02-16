import { Router } from 'express';
import { getWebsiteByUniqueId } from '../controllers';

const router = Router();

// Public API endpoints - No authentication required
// Get website content by unique ID
router.get('/website/:uniqueId', getWebsiteByUniqueId);

export default router;
