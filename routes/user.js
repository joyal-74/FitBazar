import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import productController from "../controllers/productController.js";


// home route
router.get('/home', userController.getUserHome); 

// login route
router.get('/login', userController.loadLogin);
router.post('/login', userController.userLogin);

// register route
router.get('/register', userController.loadRegister);
router.post('/register', userController.userRegister);

router.get('/forgetPass', userController.loadForgetPass);

router.post('/sendmail', userController.generateOtp)


router.get('/otpverify', userController.loadOtpVerify);
router.post('/otpverify', userController.verifyOtp)

router.get('/resetpass', userController.loadConfirmOtp);
router.post('/resetpass',userController.changePassword)

router.get("/logout", userController.logoutUser );


//shop page
router.get('/shop', productController.loadShop)
router.get('/product', productController.loadproductDetails)

export default router;