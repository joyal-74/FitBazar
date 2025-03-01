import passport from "passport";
import express from "express";
const router = express.Router();


router.get('/auth/google', passport.authenticate('google',{scope:['profile', 'email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    res.redirect("/user/home")
})

export default router;