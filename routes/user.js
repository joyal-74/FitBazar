import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import profileController from "../controllers/profileController.js";
import cartControlller from '../controllers/cartController.js'


// login route
router.get('/login', userController.loadLogin);
router.post('/login', userController.userLogin);

// register route
router.get('/register', userController.loadRegister);
router.post('/register', userController.userRegister);

router.get('/forgetPass', userController.loadForgetPass);

router.post('/sendmail', userController.generateOtp);
router.post('/resendOtp', userController.resendOtp);

router.get('/otpverify', userController.loadOtpVerify);
router.post('/otpverify', userController.verifyOtp)

router.get('/resetpass', userController.loadConfirmOtp);
router.post('/resetpass',userController.changePassword)


//address management
router.get('/profile', profileController.loadprofile);
router.get('/address',profileController.loadAddress);
router.post('/address',profileController.addAddress);
router.get('/addAddress',profileController.loadAddAddress);
router.get('/editaddress', profileController.loadEditAddress);
router.put('/address', profileController.editAddress);
router.delete('/address', profileController.deleteAddress);
router.get('/coupons', profileController.loadCoupons);
router.get('/privacy', profileController.loadPrivacy);

router.get('/cart', cartControlller.loadCart);
router.get('/checkout', cartControlller.loadCheckout);
router.get('/checkout', cartControlller.loadCheckout);
router.get('/payments', cartControlller.loadPayments);
router.get('/confirmOrder', cartControlller.confirmOrder);



router.get("/logout", userController.logoutUser );


export default router;