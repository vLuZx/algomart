import { Router, type IRouter } from 'express';
import {
    addProductController,
    createSessionController,
    deleteProductController,
    deleteSessionController,
    getProductController,
    getSessionController,
    listProductsController,
    listSessionsController,
    renameSessionController,
    updateProductFoundPriceController,
} from '../controllers/sessions.controller.js';

const router: IRouter = Router();

// Sessions
router.get('/', listSessionsController);
router.post('/', createSessionController);
router.get('/:sessionId', getSessionController);
router.patch('/:sessionId', renameSessionController);
router.delete('/:sessionId', deleteSessionController);

// Products in a session
router.get('/:sessionId/products', listProductsController);
router.post('/:sessionId/products', addProductController);
router.get('/:sessionId/products/:productId', getProductController);
router.patch('/:sessionId/products/:productId', updateProductFoundPriceController);
router.delete('/:sessionId/products/:productId', deleteProductController);

export default router;
