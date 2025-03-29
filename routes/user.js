import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import profileController from "../controllers/profileController.js";
import cartControlller from '../controllers/cartController.js'
import refundController from '../controllers/refundController.js'
import reviewController from '../controllers/reviewController.js'
import upload from "../middleware/imageUpload.js";
import wishlistController from "../controllers/wishlistController.js";
import walletController from '../controllers/walletController.js'
import couponController from "../controllers/couponController.js";


// login route
router.get('/login', userController.loadLogin);
router.post('/login', userController.userLogin);

// logout route
router.post('/logout', userController.logoutUser);


// register route
router.get('/register', userController.loadRegister);
router.post('/register', userController.userRegister);

router.get('/forgetPass', userController.loadForgetPass);

router.post('/sendmail', userController.generateOtp);
router.post('/resendOtp', userController.resendOtp);

router.get('/otpverify', userController.loadOtpVerify);
router.get('/otpTimer', userController.otpTimer);
router.post('/otpverify', userController.verifyOtp)

router.get('/resetpass', userController.loadConfirmOtp);
router.post('/resetpass',userController.changePassword)

// profile management
router.get('/profile', profileController.loadprofile);
router.get('/profileU', profileController.loadUpdateProfile);
router.put('/profile', upload.single('profilePic'), profileController.updateProfile)
router.post('/sendotp', profileController.sendOTP);
router.post('/verifymail', profileController.verifyOTP);

//address management
router.get('/address',profileController.loadAddress);
router.post('/address',profileController.addAddress);
router.get('/addAddress',profileController.loadAddAddress);
router.get('/editaddress', profileController.loadEditAddress);
router.put('/address', profileController.editAddress);
router.delete('/address', profileController.deleteAddress);
router.get('/coupons', profileController.loadCoupons);
router.get('/privacy', profileController.loadPrivacy);
router.post('/privacy', profileController.updatePassword);


router.get('/wishlist', wishlistController.getWishlist);
router.post('/wishlist', wishlistController.addToWishlist);

router.post('/wishlist/remove', wishlistController.removeFromWishlist);

router.post('/addToCart', cartControlller.addItemToCart)
router.get('/cart', cartControlller.loadCart);
router.patch('/cart', cartControlller.updateQuantity);
router.delete('/cart', cartControlller.deleteFromcart);

router.get('/wallet', walletController.loadWallet)

router.get('/checkout', cartControlller.loadCheckout);
router.post('/checkout', cartControlller.checkoutDetails);
router.post('/validate-coupon', couponController.validateCoupon);

router.get('/shoppingAddressAdd', cartControlller.loadAddShoppingAddress);
router.post('/shoppingAddress', cartControlller.addShoppingAddress);

router.get('/shoppingAddress', cartControlller.loadshoppingAddress);
router.put('/shoppingAddress', cartControlller.editshoppingAddress);

router.get('/confirmOrder', cartControlller.confirmOrder);

router.get('/orders', profileController.loadOrders);
router.get('/orderDetails', profileController.loadOrderDetails);

router.post('/orders/return', refundController.requestRefund);
router.patch('/orders/cancel', refundController.cancelOrder);
router.get('/orders/invoice', refundController.generateInvoice);

router.post('/review', reviewController.addReview);

router.get("/logout", userController.logoutUser );


export default router;