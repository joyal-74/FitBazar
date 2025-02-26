import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import passport from "passport";

// home route
router.get('/home', userController.getUserHome); 

// login route
router.get('/login', userController.loadLogin);
router.post('/login', userController.userLogin);


router.get('/auth/google', passport.authenticate('google',{scope:['profile', 'email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    res.redirect("/home")
})

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

export default router;