import express from 'express';
import HomepageController from '../controllers/homepageController.js';

const router = express.Router();

router.get('/', HomepageController.renderHomepage);
router.get('/home', (req, res) => res.redirect(301, '/'));
router.get('/politica-de-privacidade', HomepageController.renderPrivacyPolicy);
router.get('/termos-de-uso', HomepageController.renderTermsOfUse);

export default router;
