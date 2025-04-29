import passport from "passport";
import express from "express";
const router = express.Router();


router.get('/google', passport.authenticate('google',{scope:['profile', 'email']}));
router.get('/google/callback', passport.authenticate('google',{
            failureRedirect:'/user/login', 
            failureMessage: true,
        }),(req,res)=>{

    req.session.userLogged = true

    req.session.user = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
    };
    res.redirect("/")
})

export default router;