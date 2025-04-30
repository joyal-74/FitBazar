import User from "../model/userModel.js";

const checkStatus = (req, res, next) => {
    if (req.session.isBlocked === true) {
        console.log("User is blocked. Redirecting to login...");
        return res.render('user/login', {title : "Login", errorMessage : "you are blocked contact support"});
    } 
    console.log("User is not blocked. Proceeding...");
    next();
};


const isLogin = async (req, res, next) => {
    if (req.session.userLogged) {
        try {
            const user = await User.findById(req.session.userId);
            if (!user || user.isBlocked) {
                req.session.destroy(err => {
                    if (err) {
                        console.error("Session destroy error:", err);
                        return res.status(500).send("Error logging out.");
                    }
                    return res.redirect('/user/login');
                });
            } else {
                return res.redirect('/');
            }
        } catch (err) {
            console.error("Login check error:", err);
            return res.status(500).send("Internal server error");
        }
    } else {
        next();
    }
};

export const verifyUserStatus = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            
            if (!user || user.isBlocked) {
                req.session.destroy(err => {
                    if (err) {
                        console.error("Session destroy error:", err);
                        return res.status(500).send("Error logging out.");
                    }
                    return res.redirect('/user/login?error=blocked');
                });
            } else {
                req.session.user = user; // refresh session user
                next();
            }
        } catch (err) {
            console.error("Error checking user status:", err);
            return res.status(500).send("Internal server error");
        }
    } else {
        next();
    }
};


export default {checkStatus , isLogin, verifyUserStatus };
