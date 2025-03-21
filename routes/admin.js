
import express from "express";
const router = express.Router();
import adminController from '../controllers/adminController.js';
import categoryController from '../controllers/categoryController.js'
import productController from "../controllers/productController.js";
import upload from "../middleware/imageUpload.js";
import customerController from "../controllers/customerController.js";
import adminAuth from "../middleware/authMiddleware.js";
import { uploads, handleUploads } from '../middleware/uploadMiddleware.js';
import refundController from "../controllers/refundController.js";

// admin login route
router.get('/login', adminAuth.isLogin, adminController.loadLogin);
router.post('/login', adminController.adminLogin);
router.get('/logout', adminController.logout);

// dashboard
router.get('/dashboard', adminAuth.checkSession, adminController.loadDashboard);

// category Management
router.get('/categories',adminAuth.checkSession, categoryController.categoryInfo);
router.post('/categories', upload.single("addThumbnail"), categoryController.addCategory);
router.put('/categories', upload.single('editThumbnail'),categoryController.editCategory);
router.get('/categories/filter', adminAuth.checkSession, categoryController.filterCategories);

// product management


router.get('/products', adminAuth.checkSession, productController.productInfo);
router.get('/newProducts', adminAuth.checkSession, productController.loadaddProducts);

router.post('/addProducts',upload.any(),productController.addProducts);

router.get('/updateProducts/:productId',adminAuth.checkSession, productController.loadEditProducts);
router.put('/products/:productId',upload.any(),productController.editProducts);

// user management
router.get('/customers',adminAuth.checkSession, customerController.userInfo);
router.put("/customers", customerController.toggleBlockStatus);
router.get('/viewcustomers',adminAuth.checkSession, customerController.userDeatails);
router.post('/viewcustomers', customerController.changeBlockStatus);
router.get('/customers/filter',adminAuth.checkSession, customerController.filterCustomers);


// order management
router.get('/orders', adminController.loadOrders);
router.patch('/orders', adminController.updateStatus);
router.get('/vieworders', adminController.viewOrders);


// Return management

router.get('/refunds', refundController.loadReturnPage);
router.patch('/refunds', refundController.updateRefundStatus);



export default router;