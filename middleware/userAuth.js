const checkStatus = (req, res, next) => {
    if (req.session.isBlocked === true) {
        console.log("User is blocked. Redirecting to login...");
        return res.render('user/login', {title : "Login", errorMessage : "you are blocked contact support"});
    } 
    console.log("User is not blocked. Proceeding...");
    next();
};


const redirectIfLoggedIn = (req, res, next) => {
    if (req.session.userLogged && req.session.user) {
        return res.redirect('/');
    }
    next();
};

const isLogin = (req,res,next)=>{
    if(req.session.user){
        res.redirect('/')
    }else{
        next()
    }
}

export default {checkStatus, redirectIfLoggedIn , isLogin };
