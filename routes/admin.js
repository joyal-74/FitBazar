import express from "express";
const router = express.Router();
import adminController from '../controllers/adminController.js';
import categoryController from '../controllers/categoryController.js'
import productController from "../controllers/productController.js";
import upload from "../middleware/imageUpload.js";
import customerController from "../controllers/customerController.js";
import adminAuth from "../middleware/authMiddleware.js";
import refundController from "../controllers/refundController.js";
import couponController from '../controllers/couponController.js'
import offerController from "../controllers/offerController.js";
import salesController from '../controllers/salesController.js'

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


router.post('/categories/offer', offerController.addCategoryOffer);
router.patch('/categories/offer', offerController.removeCategorytOffer);

// product management
router.get('/products', adminAuth.checkSession, productController.productInfo);
router.get('/newProducts', adminAuth.checkSession, productController.loadaddProducts);
router.post('/addProducts',upload.any(),productController.addProducts);
router.get('/updateProducts/:productId',adminAuth.checkSession, productController.loadEditProducts);
router.put('/products/:productId',upload.any(),productController.editProducts);

router.post('/products/offer', offerController.addProductOffer);
router.patch('/products/offer', offerController.removeProductOffer);

// user management
router.get('/customers',adminAuth.checkSession, customerController.userInfo);
router.put("/customers", customerController.toggleBlockStatus);
router.get('/viewcustomers',adminAuth.checkSession, customerController.userDeatails);
router.post('/viewcustomers', customerController.changeBlockStatus);
router.get('/customers/filter',adminAuth.checkSession, customerController.filterCustomers);


// order management
router.get('/orders',adminAuth.checkSession, adminController.loadOrders);
router.patch('/orders', adminController.updateStatus);
router.get('/vieworders', adminAuth.checkSession, adminController.viewOrders);


// Return management
router.get('/refunds', adminAuth.checkSession, refundController.loadReturnPage);
router.patch('/refunds', refundController.updateRefundStatus);

router.get('/coupons', couponController.loadCouponPage);
router.post('/coupons', couponController.addCoupon);
router.put('/coupons', couponController.editCoupon);
router.delete('/coupons', couponController.deleteCoupon);


// sales report
router.get('/sales', salesController.loadSalesReport);
router.get('/sales/download/pdf', salesController.generateSalesReportPDF);
router.get('/sales/download/excel', salesController.downloadSalesReportExcel);


export default router;