import User from "../model/userModel.js";
import Address from "../model/addressModel.js";
import nodemailer from "nodemailer"
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, UNAUTHORIZED, INTERNAL_SERVER_ERROR, BAD_REQUEST } from '../config/statusCodes.js'

const loadOrders = async (req, res) => {
    const search = req.query.search || '';

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            return res.status(UNAUTHORIZED).redirect('/user/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(NOT_FOUND).send('User not found');
        }

        const [firstName] = user.name.split(' ');

        const filter = { userId };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
            ];
        }

        const orders = await Order.find(filter).populate('product').sort({ createdAt: -1 });

        res.render('user/orders', {title: 'My Orders', orders, user, firstName, search});

    } catch (error) {
        console.error('Error loading orders:', error.message);
        res.status(INTERNAL_SERVER_ERROR).send('An error occurred while loading your orders');
    }
};

const loadOrderDetails = async (req,res)=> {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const orderId = req.query.id;

        if (!userId) {
            return res.status(UNAUTHORIZED).redirect('/user/login');
        }

        const user = await User.findOne({_id : userId})
        const [firstName] = user.name.split(' ');

        const order = await Order.findOne({ orderId }).populate('product');
        const addressId = order.address

        const addresses = await Address.findOne(
            { 'details._id': addressId },
            { details: { $elemMatch: { _id: addressId } } }
        );
        
        const address = addresses?.details?.[0] || null;

        res.render('user/orderdetails',{title : "My Orders",order, address, user, firstName});

    } catch (error) {
        console.error('Error loading orders:', error.message);
    }
}

const loadprofile = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    if (!userId) return res.redirect('/user/login');

    const user = await User.findOne({_id : userId})
    const [firstName, lastName] = user.name.split(' ');
    res.render('user/profile',{title : "User Pofile", user, firstName, lastName })
}

const loadUpdateProfile = async (req,res) => {
    const userId = req.query.userId;

    const user = await User.findOne({ userId : userId});
    const [firstName, lastName] = user.name.split(' ');
    res.render('user/profileU',{title : "Edit Pofile", user, firstName, lastName })
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTPMail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Your OTP for FitBazar Profile Update',
        text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    };
    await transporter.sendMail(mailOptions);
};

const sendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(BAD_REQUEST).json({ success: false, error: 'Email is required' });
    }

    const otp = generateOTP();
    req.session.emailOtp = otp;
    console.log(otp)

    try {
        await sendOTPMail(email, otp);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to send OTP' });
    }
}

const verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(BAD_REQUEST).json({ success: false, error: 'Email and OTP are required' });
    }

    const storedData = req.session.emailOtp;
    console.log(storedData)
    console.log(otp)

    if (!storedData) {
        return res.status(BAD_REQUEST).json({ success: false, error: 'No OTP found for this email' });
    }

    if (storedData === otp) {
        delete req.session.emailOtp;
        return res.json({ success: true, message: 'OTP verified successfully' });
    }
    res.status(BAD_REQUEST).json({ success: false, error: 'Invalid OTP' });
}

const updateProfile = async (req, res) => {
    try {
        let { firstName, lastName, email, name, phone, username, gender } = req.body;
        const userId = req.query.id;

        if (typeof username === "string") {
            username = username.trim();
        }

        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(NOT_FOUND).json({ error: "User not found" });
        }

        if (username && username !== user.username) {
            const uniqueUsername = await User.findOne({ username });
            if (uniqueUsername) {
                return res.status(BAD_REQUEST).json({ error: "Username already taken...!" });
            }
            user.username = username;
        }

        if (req.file) {
            user.profilePic = req.file.path;
        }

        name = `${firstName} ${lastName}`;

        user.name = name;
        user.email = email;
        user.phone = phone;
        user.gender = gender;

        await user.save();

        req.session.user = user;

        return res.status(OK).json({ message: "Profile updated successfully", user });

    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
};

export default {loadOrders, loadOrderDetails, loadprofile, loadUpdateProfile, verifyOTP, sendOTP, updateProfile };