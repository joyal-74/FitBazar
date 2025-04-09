const checkStatus = (req, res, next) => {
    if (req.session.isBlocked === true) {
        console.log("User is blocked. Redirecting to login...");
        return res.render('user/login', {title : "Login", errorMessage : "you are blocked contact support"});
    } 
    console.log("User is not blocked. Proceeding...");
    next();
};


const isLogin = (req,res,next)=>{    
    if(req.session.userLogged){
        res.redirect('/')
    }else{
        next()
    }
}

export default {checkStatus , isLogin };
