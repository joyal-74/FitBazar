
import express from "express";
const router = express.Router();
import adminController from '../controllers/adminController.js';
import categoryController from '../controllers/categoryController.js'
import productController from "../controllers/productController.js";
import upload from "../middleware/imageUpload.js";
import customerController from "../controllers/customerController.js";
import adminAuth from "../middleware/authMiddleware.js";

router.get('/login', adminAuth.isLogin, adminController.loadLogin);
router.post('/login', adminController.adminLogin);
router.get('/logout', adminController.logout);

router.get('/dashboard', adminAuth.checkSession, adminController.loadDashboard);

// category Management
router.get('/categories', categoryController.categoryInfo);
router.post('/categories', upload.single("addThumbnail"), categoryController.addCategory);
router.put('/categories', upload.single('editThumbnail'),categoryController.editCategory);
router.get('/categories/filter', categoryController.filterCategories);

// product management
router.get('/products', productController.productInfo);
router.get('/addProducts', productController.loadaddProducts);
router.post('/addProducts',upload.array('productImages'),productController.addProducts);
router.get('/editProducts/:productId', productController.loadEditProducts);
router.put('/editProducts',upload.array('productImages'),productController.editProducts);

// user management
router.get('/customers', customerController.userInfo);
router.put("/customers", customerController.toggleBlockStatus);
router.get('/viewcustomers', customerController.userDeatails);
router.post('/viewcustomers', customerController.changeBlockStatus);
router.get('/customers/filter', customerController.filterCustomers);



// order management
router.get('/orders', adminController.loadOrders);
router.get('/vieworders', adminController.viewOrders);


export default router;