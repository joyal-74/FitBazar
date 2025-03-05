import passport from "passport";
import express from "express";
const router = express.Router();


router.get('/google', passport.authenticate('google',{scope:['profile', 'email']}));
router.get('/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    res.redirect("/home")
})

export default router;