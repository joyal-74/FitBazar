
import express from "express";
const router = express.Router();
import adminController from '../controllers/adminController.js';
import categoryController from '../controllers/categoryController.js'
import categoryMiddlewere from '../middleware/ccategoryMiddlewere.js'


router.get('/login', adminController.loadLogin);
router.post('admin/login', adminController.adminLogin);


router.get('/dashboard', adminController.loadDashboard);

// category Management
router.get('/categories', categoryController.categoryInfo);
router.post('/categories', categoryMiddlewere.upload.single("addThumbnail"), categoryController.addCategory);
router.put('/categories', categoryMiddlewere.upload.single('editThumbnail'),categoryController.editCategory);
router.get('/categories/filter', categoryController.filterCategories);


router.get('/orders', adminController.loadOrders);
router.get('/vieworders', adminController.viewOrders);


router.get('/products', adminController.loadProducts);
router.get('/addProducts', adminController.addProducts);

router.get('/customers', adminController.loadCustomers);

export default router;