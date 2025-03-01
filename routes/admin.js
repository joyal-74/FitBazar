
import express from "express";
const router = express.Router();
import adminController from '../controllers/adminController.js';
import categoryController from '../controllers/categoryController.js'
import categoryMiddlewere from '../middleware/ccategoryMiddlewere.js'
import productController from "../controllers/productController.js";
import productMiddleware from "../middleware/productMiddleware.js";


router.get('/login', adminController.loadLogin);
router.post('/login', adminController.adminLogin);

router.get('/dashboard', adminController.loadDashboard);

// category Management
router.get('/categories', categoryController.categoryInfo);
router.post('/categories', categoryMiddlewere.upload.single("addThumbnail"), categoryController.addCategory);
router.put('/categories', categoryMiddlewere.upload.single('editThumbnail'),categoryController.editCategory);
router.get('/categories/filter', categoryController.filterCategories);

// product management
router.get('/products', productController.productInfo);
router.get('/addProducts', productController.loadaddProducts);
router.post('/addProducts',productMiddleware.upload.array('productImages'),productController.addProducts);

router.get('/editProducts/:productId', productController.loadEditProducts);
router.put('/editProducts',productMiddleware.upload.array('productImages'),productController.editProducts);

router.get('/orders', adminController.loadOrders);
router.get('/vieworders', adminController.viewOrders);


router.get('/customers', adminController.loadCustomers);

export default router;