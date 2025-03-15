import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import Category from '../model/categoryModel.js'
import Products from "../model/productModel.js";
import nodemailer from "nodemailer"
import { OK,  NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'
import sendEmail from "../helpers/emailhelper.js";
import emailTemplate from "../helpers/emailTemplate.js";


// Home Page Handler
const getUserHome = async (req, res)=> {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    const user = await User.findOne({ _id : userId});
    const category = await Category.find();
    const product = await Products.find({visibility : true}).sort({createdAt : -1}).limit(8);

    res.render('home', { title: 'Home Page', category, product, user });
}

// Login Page Handler
function loadLogin(req, res) {
    res.render('user/login', { title: 'Login Page', errorMessage: "" });
}

// Register Page Handler
function loadRegister(req, res) {
    res.render('user/register', { title: 'Register Page', errorMessage: "" });
}


const userLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(BAD_REQUEST).json({message : "User Not exist please signUp"});
        }

        if (!user.password === "") {
            console.warn(`⚠️ User with email ${email} has no password. Redirecting to Google login.`);
            return res.redirect('/auth/google');  
        }

        if (user.isBlocked) {
            res.status(BAD_REQUEST).json({error : "Your account has been blocked. Please contact support." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("not matched")
            return res.status(BAD_REQUEST).json({error : "Invalid email or password"});
        }

        req.session.user = user
        req.session.userId = user._id;


        return res.status(OK).json({message : "Login successful", redirectUrl : '/'});

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(INTERNAL_SERVER_ERROR).json({error : "Internal server error"});
    }
};


const generateUserId = async () => {
    const count = await User.countDocuments();
    return `ID${1000 + count + 1}`;
};

const otpTimer = async (req, res)=> {
    const otpExpire = req.session.otpExpire || 0;
    const timeLeft = Math.max(0, Math.ceil((otpExpire - Date.now()) / 1000));

    if (timeLeft > 0) {
        return res.json({ timeLeft, canResend: false });
    } else {
        return res.json({ timeLeft: 0, canResend: true });
    }
}

// Function to generate a 4-digit OTP
const generateOtpCode = () => Math.floor(1000 + Math.random() * 9000);

const userRegister = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(BAD_REQUEST).json({ error: "Email is already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await generateUserId();


        const newuser = {
            userId : userId,
            email : email,
            password : hashedPassword,
            name: fullName, 
            phone : phone
        }

        req.session.newuser = newuser

        const otp = generateOtpCode();
        console.log("Generated OTP:", otp);


        req.session.otp = otp;
        req.session.otpExpire = Date.now() + 30 * 1000;
        req.session.otpEmail = email;
        req.session.requestFrom = "register";


        if (!process.env.EMAIL || !process.env.PASSWORD) {
            console.error("Missing email credentials in environment variables.");
            return res.status(INTERNAL_SERVER_ERROR).json({ error: "Server email configuration error. Please try again later." });
        }

        const emailContent = emailTemplate.getOtpEmailTemplate(email, otp);

        try {
            await sendEmail(email, "Verify Your Email for FitBazar", emailContent);
            return res.status(OK).json({ message: "Registration successful. OTP sent to email.", expireTime: req.session.otpExpire });
        } catch (error) {
            console.error("Email sending error:", error);
            return res.status(INTERNAL_SERVER_ERROR).json({ error: "Failed to send verification email. Please try again." });
        }

    } catch (err) {
        console.error("Registration error:", err);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error. Please try again later." });
    }
};




const loadForgetPass = (req, res) => {
    res.render('user/forgetPass', { title: 'Forgot Password ?', errorMessage: "" })
}


const generateOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: "Email is required",
        });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        console.log("This email is not registered yet");
        return res.status(BAD_REQUEST).json({
            success: false,
            message: "Email not registered",
        });
    }


    const otp = generateOtpCode();
    console.log("Generated OTP:", otp);

    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpire = Date.now() + 30 * 1000;
    const timeLeft = Math.floor((req.session.otpExpire - Date.now()) / 1000);
    req.session.requestFrom = "forgot-password";

    const emailContent = emailTemplate.getResetPasswordEmailTemplate;

    try {
        await sendEmail(email, "Your OTP for FitBazar Password Reset", emailContent, otp);
        console.log(req.session.otpExpire)
        return res.status(OK).json({
            success: true,
            message: "OTP sent successfully",
            timeLeft,
            redirectUrl: "/user/otpverify",
        });
    } catch (error) {
        console.error("OTP Sending Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to send OTP. Please try again.",
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        const otp = generateOtpCode();
        console.log("New OTP:", otp);

        req.session.otp = otp;
        const email = req.session.email;
        req.session.otpExpire = Date.now() + 30 * 1000;
        const timeLeft = Math.floor((req.session.otpExpire - Date.now()) / 1000);

        const emailContent = emailTemplate.getResetPasswordEmailTemplate;

        if (!email) {
            return res.status(BAD_REQUEST).json({ error: "Session expired. Please start the verification process again." });
        }

        await sendEmail(email, "Your OTP for FitBazar Password Reset", emailContent);
        console.log('done')
        return res.status(OK).json({ message: "OTP sent successfully" , timeLeft });
    } catch (error) {
        console.error("OTP Sending Error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({error: "Failed to send OTP. Please try again.",});
    }
};


const loadOtpVerify = async (req, res) => {
    res.render('user/otpverify', { title: "Verify OTP"});
}

const verifyOtp = async (req, res) => {
    const { otp1, otp2, otp3, otp4} = req.body;

    const requestFrom = req.session.requestFrom;

    const formOtp = `${otp1}${otp2}${otp3}${otp4}`;

    const sentOtp = req.session.otp;
    const otpExpire = req.session.otpExpire || 0;

    console.log("Session OTP:", sentOtp);
    console.log("Form OTP:", formOtp);
    console.log(requestFrom)

    if (!formOtp || !sentOtp) {
        return res.status(BAD_REQUEST).json({ error : "Invalid OTP. Please try again."});
    }

    if (Date.now() > otpExpire) {
        return res.status(BAD_REQUEST).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check if the OTP matches
    if (formOtp.toString() === sentOtp.toString()) {
        console.log("OTP matched. Verification successful.");

        if (requestFrom === "register") {
            const {userId, email, password, name, phone} = req.session.newuser
            const newuser = new User({ userId, email, password, name, phone });
            await newuser.save();

            console.log("Register successful Redirecting to login page...");
            return res.status(OK).json({ message: "OTP verified successfully! Now login to your account", redirectUrl: '/user/login' });
        } else {
            console.log("Redirecting to password reset page...");
            return res.status(OK).json({message: "OTP verified successfully!", redirectUrl: '/user/resetpass' });
        }
    } else {
        return res.status(BAD_REQUEST).json({ error : "OTP does not match. Please try again."});
    }
};



let loadConfirmOtp = (req, res) => {
    res.render('user/resetpass', { title: 'Confirm Password ?', errorMessage: "" })
}


const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;

        console.log(email);

        if (!newPassword || !confirmPassword) {
            return res.status(BAD_REQUEST).json({ success: false, message: "All fields are required" });
        }

        if (newPassword.length < 6) {
            return res.status(BAD_REQUEST).json({ success: false, message: "Password must be 6+ characters" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(BAD_REQUEST).json({ success: false, message: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found for email:", email);
            return res.status(NOT_FOUND).json({ success: false, message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(OK).json({ 
            success: true, 
            message: "Password changed successfully",
            redirectUrl: "/user/login"
        });

    } catch (err) {
        console.error("Password change error:", err);
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};



const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error destroying session");
        }
        res.reder('user/login', { title: "login page", errorMessage: "Session destroyed. You are logged out." });
    });
};

export default { getUserHome, loadLogin, loadRegister, userLogin, userRegister, resendOtp, loadForgetPass, otpTimer,
                 loadConfirmOtp, changePassword, loadOtpVerify, logoutUser, generateOtp, verifyOtp };