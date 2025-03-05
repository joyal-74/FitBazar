import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import Category from '../model/categoryModel.js'
import nodemailer from "nodemailer"

// Home Page Handler
const getUserHome = async (req, res)=> {
    const category = await Category.find();
    res.render('home', { title: 'Home Page', category });
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
    let errorMessage = ""; // Store general error message

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

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            errorMessage = "Invalid email or password";
            return res.render('user/login', { title: "Login Page", errorMessage });
        }

        // Redirect on success
        return res.redirect('/user/home');

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

const userRegister = async (req, res) => {
    try {
        const { email, password, confirmPassword, fullName } = req.body;

        // Ensure all fields are provided
        if (!email || !password || !confirmPassword) {
            return res.render("user/register", { title: "register page", errorMessage: "All fields are required" });
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.render("user/register", { title: "register page", errorMessage: "Invalid email format" });
        }

        // Check password length
        if (password.length < 6) {
            return res.render("user/register", { title: "register page", errorMessage: "Password must be 6+ characters" });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render("user/register", { title: "register page", errorMessage: "Passwords do not match" });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Email is already in use")
            return res.render("user/register", { title: "register page", errorMessage: "Email is already in use" });
        }

        // Hash password before saving

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await generateUserId()
        const newUser = new User({ userId, email, password: hashedPassword, name: fullName });

        // Save user to DB
        await newUser.save();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });
    
        // Email options
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Your FitBazar account successfully created",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2118cc;">FitBazar Account successfully created</h2>
                    <p>Hello,</p>
                    <p>Your fitbazar account Email is:</p>
                    <p style="font-size: 12px; font-weight: bold; color:#2118cc;">Email : ${email}</p>
                    <p>Please use mail to complete your login process.</p>
                    <h5>If you did not put this login request, please contact - <span color:#2118cc;><a>fitbazarapplication@gmail.com.</a></span></h5>
                    <p>Best regards,<br>The FitBazar Team</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
                </div>
            `,
        };
    
        
        // Send the email
        try {
            await transporter.sendMail(mailOptions);
            console.log("Verification mail sent to:", email);
            res.redirect("/user/login");
        } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).render('user/register', {
                title: "register page",
                errorMessage: "Failed to send mail. Please try again.",
            });
        }        

    } catch (err) {
        console.error("Registration error:", err);
        res.render("user/register", { title: "register page", errorMessage: "Internal server error" });
    }
};


const loadForgetPass = (req, res) => {
    res.render('user/forgetPass', { title: 'Forgot Password ?', errorMessage: "" })
}

const generateOtp = async (req, res) => {
    const { email } = req.body;

    // Validate email
    if (!email) {
        return res.status(400).render('user/forgetPass', {
            title: "Forgot Password",
            errorMessage: "Email is required",
        });
    }

    const existingUser = await User.findOne({ email });
        if (!existingUser) {
            console.log("This email is not registered yet")
            return res.render("user/forgetPass", { title: "register page", errorMessage: "Email not registered" });
        }


    // Generate a 4-digit OTP
    const genOTP = () => {
        return Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit OTP
    };

    const otp = genOTP();

    // Store the OTP and email in the session
    req.session.otp = otp;
    req.session.email = email;

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    // Email options
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
                <p>If you did not request to reset password, please ignore this email.</p>
                <p>Best regards,<br>The FitBazar Team</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
            </div>
        `,
    };

    
    // Send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log("OTP sent successfully to:", email);
        res.redirect("/user/otpverify");
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).render('user/forgetPass', {
            title: "Forgot Password",
            errorMessage: "Failed to send OTP. Please try again.",
        });
    }
};


const loadOtpVerify = (req, res) => {
    res.render('user/otpverify', { title: "otp verify page" , errorMessage: ""})
}

const verifyOtp = (req, res) => {
    const { otp1, otp2, otp3, otp4 } = req.body;

    // Combine the OTP digits into a single string
    const formOtp = `${otp1}${otp2}${otp3}${otp4}`;

    // Retrieve the OTP stored in the session
    const sentOtp = req.session.otp; // Ensure this is initialized

    // Debugging: Log the OTPs
    console.log("Session OTP:", sentOtp);
    console.log("Form OTP:", formOtp);

    // Validate the OTP
    if (!formOtp || !sentOtp) {
        return res.status(400).render('user/otpverify', {
            title: 'Change Password',
            errorMessage: "Invalid OTP. Please try again.",
        });
    }

    if (formOtp === "expired") {
        return res.status(400).render('user/otpverify', {
            title: 'Change Password',
            errorMessage: "OTP Exprired. Please try again.",
        });
    }

    // Compare the OTPs (ensure both are strings)
    if (formOtp === sentOtp.toString()) {
        console.log("OTP matched. Verification successful.");
        res.redirect('/user/resetpass'); // Redirect to the reset password page
    } else {
        res.status(400).render('user/otpverify', {
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

        // Ensure all fields are provided
        if (!newPassword || !confirmPassword) {
            return res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "All fields are required" });
        }

        // Check password length
        if (newPassword.length < 6) {
            return res.render("user/resetpass", { title: "Confirm Password page", errorMessage: "Password must be 6+ characters" });
        }

        // Check if passwords match
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

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Redirect on success
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

export default { getUserHome, loadLogin, loadRegister, userLogin, userRegister, loadForgetPass, loadConfirmOtp, changePassword, loadOtpVerify, logoutUser, generateOtp, verifyOtp };