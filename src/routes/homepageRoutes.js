import express from 'express';
import HomepageController from '../controllers/homepageController.js';

const router = express.Router();

router.get('/', HomepageController.renderHomepage);
router.get('/home', (req, res) => {
    res.redirect(301, '/');
});

export default router;