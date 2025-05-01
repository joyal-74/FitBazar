import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import profileController from "../controllers/profileController.js";
import cartControlller from '../controllers/cartController.js';
import checkoutController from "../controllers/checkoutController.js";
import refundController from '../controllers/refundController.js'
import reviewController from '../controllers/reviewController.js'
import upload from "../middleware/imageUpload.js";
import wishlistController from "../controllers/wishlistController.js";
import walletController from '../controllers/walletController.js';
import couponController from "../controllers/couponController.js";
import paymentController from "../controllers/paymentController.js";
import userAuth from "../middleware/userAuth.js";
import addressController from "../controllers/addressController.js";
import privacyController from "../controllers/privacyController.js";


// login route
router.get('/login', userAuth.isLogin, userController.loadLogin);
router.post('/login', userController.userLogin);

// register route
router.get('/register', userAuth.isLogin, userController.loadRegister);
router.post('/register', userController.userRegister);

// password reset routes
router.get('/forgetPass', userController.loadForgetPass);
router.post('/sendmail', userController.generateOtp);
router.post('/resendOtp', userController.resendOtp);
router.get('/otpverify', userController.loadOtpVerify);
router.get('/otpTimer', userController.otpTimer);
router.post('/otpverify', userController.verifyOtp);
router.get('/resetpass', userController.loadConfirmOtp);
router.post('/resetpass',userController.changePassword);

// profile management
router.get('/profile', profileController.loadprofile);
router.get('/profileU', profileController.loadUpdateProfile);
router.put('/profile', upload.single('profilePic'), profileController.updateProfile);
router.post('/sendotp', profileController.sendOTP);
router.post('/verifymail', profileController.verifyOTP);

//address management
router.get('/address',addressController.loadAddress);
router.post('/address',addressController.addAddress);
router.get('/addAddress',addressController.loadAddAddress);
router.get('/editaddress', addressController.loadEditAddress);
router.put('/address', addressController.editAddress);
router.delete('/address', addressController.deleteAddress);
router.get('/coupons', couponController.loadCoupons);
router.get('/privacy', privacyController.loadPrivacy);
router.post('/privacy', privacyController.updatePassword);
router.post('/check-old-password', privacyController.checkOldpassword);

// wishlist routes
router.get('/wishlist', wishlistController.getWishlist);
router.post('/wishlist', wishlistController.addToWishlist);
router.delete('/wishlist', wishlistController.removeFromWishlist);

//cart routes
router.post('/cart', cartControlller.addItemToCart);
router.get('/cart', cartControlller.loadCart);
router.patch('/cart', cartControlller.updateQuantity);
router.delete('/cart', cartControlller.deleteFromcart);

// wallet routes
router.get('/wallet', walletController.loadWallet);
router.post('/wallet/razorpay', walletController.createRazorpayWallet);
router.post('/wallet/verify', walletController.verifyWalletPayment);
router.post('/wallet', walletController.moneyAddWallet);

// payment and checkout routes
router.get('/checkout', checkoutController.loadCheckout);
router.post('/checkout', checkoutController.checkoutDetails);
router.post('/validate-coupon', couponController.validateCoupon);
router.post('/shoppingAddress', checkoutController.addShoppingAddress);
router.put('/shoppingAddress', checkoutController.editshoppingAddress);

// order management
router.get('/orders', profileController.loadOrders);
router.post('/order', paymentController.createOrder);
router.get('/orderDetails', profileController.loadOrderDetails);
router.post('/orders/return', refundController.requestRefund);
router.patch('/orders/cancel', refundController.cancelOrder);
router.get('/orders/invoice', refundController.generateInvoice);
router.get('/confirmOrder', checkoutController.confirmOrder);
router.get('/payment-failed', paymentController.loadPaymentFailed);
router.post('/payment-failed', paymentController.paymentFailed);

// review route
router.post('/review', reviewController.addReview);

// logout route
router.post('/logout', userController.logoutUser);


export default router;