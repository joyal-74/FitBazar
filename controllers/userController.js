import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import Category from '../model/categoryModel.js'
import Products from "../model/productModel.js";
import nodemailer from "nodemailer"

// Home Page Handler
const getUserHome = async (req, res)=> {
    const category = await Category.find();
    const product = await Products.find({visibility : true}).sort({createdAt : -1}).limit(8)
    res.render('home', { title: 'Home Page', category, product, user: req.session.user });
}

// Login Page Handler
function loadLogin(req, res) {
    res.render('user/login', { title: 'Login Page', errorMessage: "" });
}

// Register Page Handler
function loadRegister(req, res) {
    res.render('user/register', { title: 'Register Page', errorMessage: "" });
}


let userLogin = async (req, res) => {
    const { email, password } = req.body;
    let errorMessage = "";

    // Basic validation
    if (!email || !password) {
        errorMessage = "Email and password are required";
        return res.render('user/login', { title: "Login Page", errorMessage });
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        errorMessage = "Invalid email format";
        return res.render('user/login', { title: "Login Page", errorMessage });
    }

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            errorMessage = "Invalid email or password";
            return res.render('user/login', { title: "Login Page", errorMessage });
        }

        // Ensure password exists before comparing
        if (!user.password || user.password.trim() === "") {
            console.warn(`⚠️ User with email ${email} has no password. Redirecting to Google login.`);
            return res.redirect('/auth/google');  // Redirect to Google login instead of showing error
        }

        if (user.isBlocked) {
            errorMessage = "Your account has been blocked. Please contact support.";
            return res.render('user/login', { title: "Login Page", errorMessage });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            errorMessage = "Invalid email or password";
            return res.render('user/login', { title: "Login Page", errorMessage });
        }

        req.session.user = user

        console.log(req.session.user)
        // Redirect on success
        return res.redirect('/home');

    } catch (err) {
        console.error("Login Error:", err);
        errorMessage = "Internal server error";
        return res.render('user/login', { title: "Login Page", errorMessage });
    }
};


const generateUserId = async () => {
    const count = await User.countDocuments();
    return `ID${1000 + count + 1}`;
};

// Function to generate a 4-digit OTP
const generateOtpCode = () => Math.floor(1000 + Math.random() * 9000);

const userRegister = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        // Check if email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Email is already in use");
            return res.status(400).render("user/register", { 
                title: "Register Page", 
                errorMessage: "Email is already in use" 
            });
        }

        // Hash password and generate user ID
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await generateUserId();

        // Create new user
        const newUser = new User({ userId, email, password: hashedPassword, name: fullName, phone });
        await newUser.save();

        // Generate OTP
        const otp = generateOtpCode();
        console.log("Generated OTP:", otp);

        // Store OTP in session (for later verification)
        req.session.otp = otp;
        req.session.otpEmail = email;
        req.session.requestFrom = "register";

        // Check for environment variables
        if (!process.env.EMAIL || !process.env.PASSWORD) {
            console.error("Missing email credentials in environment variables.");
            return res.status(500).render("user/register", { 
                title: "Register Page", 
                errorMessage: "Server email configuration error. Please try again later." 
            });
        }

        // Configure nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        // Email content
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Verify Your Email for FitBazar",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2118cc;">FitBazar Account Verification</h2>
                    <p>Hello,</p>
                    <p>Your registered FitBazar email is:</p>
                    <p style="font-size: 12px; font-weight: bold; color:#2118cc;">${email}</p>
                    <p>Your One-Time Password (OTP) for account verification:</p>
                    <p style="font-size: 24px; font-weight: bold; color:#2118cc;">${otp}</p>
                    <p>Please use this OTP to complete your registration process.</p>
                    <h5>If you did not request this registration, please contact - <a href="mailto:fitbazarapplication@gmail.com">fitbazarapplication@gmail.com</a></h5>
                    <p>Best regards,<br>The FitBazar Team</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
                </div>
            `,
        };

        // Send Email
        try {
            await transporter.sendMail(mailOptions);
            return res.render("user/otpverify", { title: "otp verify", errorMessage: "" });
        } catch (error) {
            console.error("Email sending error:", error);
            return res.status(500).render("user/register", {
                title: "Register Page",
                errorMessage: "Failed to send verification email. Please try again.",
            });
        }

    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).render("user/register", { 
            title: "Register Page", 
            errorMessage: "Internal server error. Please try again later." 
        });
    }
};



const loadForgetPass = (req, res) => {
    res.render('user/forgetPass', { title: 'Forgot Password ?', errorMessage: "" })
}


// Function to send OTP via email
const sendOtpEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Your OTP for FitBazar App password reset",
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2118cc;">FitBazar App password reset</h2>
                <p>Hello,</p>
                <p>Your One-Time Password (OTP) for verifying your account on FitBazar is:</p>
                <p style="font-size: 24px; font-weight: bold; color:#2118cc;">${otp}</p>
                <p>Please use this OTP to complete your verification process. This OTP is valid for a limited time.</p>
                <p>If you did not request to reset your password, please ignore this email.</p>
                <p>Best regards,<br>The FitBazar Team</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

// Common function to generate and send OTP
const handleOtpGeneration = async (req, res, redirectPage) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).render("user/forgetPass", {
            title: "Forgot Password",
            errorMessage: "Email is required",
        });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        console.log("This email is not registered yet");
        return res.render("user/forgetPass", {
            title: "Register Page",
            errorMessage: "Email not registered",
        });
    }

    // Generate OTP and store in session
    const otp = generateOtpCode();
    console.log("Generated OTP:", otp);

    req.session.otp = otp;
    req.session.email = email;
    req.session.requestFrom = "forgot-password"; 

    try {
        await sendOtpEmail(email, otp);
        res.redirect(redirectPage);
    } catch (error) {
        console.error("OTP Sending Error:", error);
        res.status(500).render("user/forgetPass", {
            title: "Forgot Password",
            errorMessage: "Failed to send OTP. Please try again.",
            requestFrom : "register"
        });
    }
};

const newOtpGeneration = async (req, res, redirectPage) => {

    // Generate OTP and store in session
    const otp = generateOtpCode();
    console.log("New OTP:", otp);

    req.session.otp = otp;
    const email = req.session.email;

    try {
        await sendOtpEmail(email, otp);
        return res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("OTP Sending Error:", error);
        res.status(500).render("user/forgetPass", {
            title: "Forgot Password",
            errorMessage: "Failed to send OTP. Please try again.",
        });
    }
};

// Route Handlers
const generateOtp = async (req, res) => {

    await handleOtpGeneration(req, res, "/user/otpverify");
};

const resendOtp = async (req, res) => {
    await newOtpGeneration(req, res, "/user/otpverify");
};



const loadOtpVerify = (req, res) => {
    res.render('user/otpverify', { title: "Verify OTP", errorMessage : "" });
}

const verifyOtp = (req, res) => {
    const { otp1, otp2, otp3, otp4} = req.body;

    const requestFrom = req.session.requestFrom;

    // Combine the OTP digits into a single string
    const formOtp = `${otp1}${otp2}${otp3}${otp4}`;

    // Retrieve the OTP stored in the session
    const sentOtp = req.session.otp;

    console.log("Session OTP:", sentOtp);
    console.log("Form OTP:", formOtp);
    console.log(requestFrom)

    // Validate if OTP exists
    if (!formOtp || !sentOtp) {
        return res.status(400).render('user/otpverify', {
            title: 'Change Password',
            errorMessage: "Invalid OTP. Please try again.",
        });
    }

    // Check if the OTP matches
    if (formOtp === sentOtp.toString()) {
        console.log("OTP matched. Verification successful.");

        if(requestFrom == "register"){
            return res.redirect('/user/login');
        }else {
            return res.redirect('/user/resetpass');
        }
    } else {
        // OTP does not match
        return res.status(400).render('user/otpverify', {
            title: 'Change Password',
            errorMessage: "OTP does not match. Please try again.",
        });
    }
};



let loadConfirmOtp = (req, res) => {
    res.render('user/resetpass', { title: 'Confirm Password ?', errorMessage: "" })
}


const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        const email = req.session.email;
        console.log(email)

        if (!newPassword || !confirmPassword) {
            return res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "All fields are required" });
        }

        if (newPassword.length < 6) {
            return res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "Password must be 6+ characters" });
        }

        if (newPassword !== confirmPassword) {
            return res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found for email:", email);
            return res.render("user/resetpass", {
                title: "Reset Password",
                errorMessage: "User not found",
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        res.redirect("/user/login");

    } catch (err) {
        console.error("Registration error:", err);
        res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "Internal server error" });
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

export default { getUserHome, loadLogin, loadRegister, userLogin, userRegister, resendOtp, loadForgetPass, loadConfirmOtp, changePassword, loadOtpVerify, logoutUser, generateOtp, verifyOtp };