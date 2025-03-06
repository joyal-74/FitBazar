const checkSession = (req, res, next) => {
    if (req.session.admin) {
        console.log("User is authenticated:", req.session.admin); // Debugging
        next();
    } else {
        console.log("User is not authenticated. Redirecting to login..."); // Debugging
        res.redirect('/admin/login');
    }
};

const isLogin = (req,res,next)=>{
    if(req.session.admin){
        res.redirect('/admin/dashboard')
    }else{
        next()
    }
}

export default {checkSession , isLogin};