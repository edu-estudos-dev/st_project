import express from 'express';
import HomepageController from '../controllers/homepageController.js';

const router = express.Router();

router.get('/', HomepageController.renderHomepage);
router.get('/home', HomepageController.renderHomepage);

export default router;
