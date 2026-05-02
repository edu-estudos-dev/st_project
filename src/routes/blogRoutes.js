import express from 'express';
import blogController from '../controllers/blogController.js';

const router = express.Router();

router.get('/blog', blogController.index);
router.get('/blog/categoria/:categoria', blogController.categoria);
router.get('/blog/:slug', blogController.artigo);

export default router;
