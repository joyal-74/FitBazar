import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import Addresses from '../model/addressModel.js'
import Address from "../model/addressModel.js";
import nodemailer from "nodemailer"
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CREATED } from '../config/statusCodes.js'
import Coupon from "../model/couponModel.js";

const loadOrders = async (req, res) => {
    const search = req.query.search || '';

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            return res.status(401).redirect('/user/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const [firstName] = user.name.split(' ');

        // Build filter with search and userId
        const filter = { userId };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
            ];
        }

        // Apply search filter and sort by latest orders
        const orders = await Order.find(filter).sort({ createdAt: -1 });

        res.render('user/orders', {
            title: 'My Orders',
            orders,
            user,
            firstName,
            search
        });
    } catch (error) {
        console.error('Error loading orders:', error.message);
        res.status(500).send('An error occurred while loading your orders');
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

        const order = await Order.findOne({ orderId });

        const addressId = order.address

        // console.log(addressId)

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

    // console.log(userId)
    // console.log(req.session.user);

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


// to edit profile details
const updateProfile = async (req,res) => {
    try {
        let { firstName, lastName, email, name, phone, username, gender } = req.body;
        const userId = req.query.id;

        const user = await User.findOne({userId : userId});

        if(user.username !== username){
            const uniqueUsername = await User.findOne({username});

            if(uniqueUsername){
                return res.status(400).json({error : "Username already taken...!"})
            }
        }

        if (req.file) {
            user.profilePic = req.file.path;
        }

        name = `${firstName} ${lastName}`

        user.name = name;
        user.email = email;
        user.phone = phone;
        user.username = username;
        user.gender = gender;

        await user.save();
        
        req.session.user = user

        return res.status(OK).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }

}


const loadAddress = async (req, res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    console.log(userId)

    if (!userId) return res.redirect('/user/login');

    const user = await User.findOne({_id : userId})

    const [firstName, lastName] = user.name.split(' ');

    try {
        const addresses = await Addresses.find({ userId : userId });

        res.render('user/address', {
            title: 'Manage Addresses',
            addresses,
            user,
            firstName, lastName
        });
    } catch (error) {
        console.error('Error loading addresses:', error);
        res.render('user/address', { title : "address", addresses: [], user: req.session.user });
    }
};

const addAddress = async (req, res) => {
    try {
        const {fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode} = req.body;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(BAD_REQUEST).json({ error: "All required fields must be filled." });
        }

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                details: []
            });
        }

        const newIndex = userAddress.details.length;

        userAddress.details.push({
            index: newIndex,
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            pincode: zipCode,
            phone,
            altPhone: altNumber
        });

        await userAddress.save();

        return res.status(CREATED).json({ message: "Address added successfully" });

    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address creation error" });
    }
};



const loadAddAddress = async (req,res)=>{

    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    const user = await User.findOne({_id : userId})

    const [firstName, lastName] = user.name.split(' ');

    res.render('user/addAddress', {title : "Address", user, firstName, lastName});
}

const loadEditAddress = async (req, res) => {
    try {
        const { id, index, from } = req.query;

        console.log(from)
        
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id : userId})
        if (!user) {
            return res.status(UNAUTHORIZED).json({ error: "Unauthorized" });
        }

        const [firstName, lastName] = user.name.split(' ');

        const address = await Address.findOne({ 
            userId: id,
        });

        if (!address) {
            return res.status(NOT_FOUND).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];
        // console.log(selectedAddress);

        if (!selectedAddress) {
            return res.status(NOT_FOUND).json({ error: "Address details not found" });
        }

        res.render('user/editaddress', { 
            title: "Edit Address",
            address: selectedAddress,
            user,
            addressId: id,
            index, firstName, lastName,
            from
        });
    } catch (error) {
        console.error("Error loading address:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};


const editAddress = async (req,res) => {
    try {
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode, index, from } = req.body;


        const userId = req.session.user?.id ?? req.session.user?._id ?? null;


        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(BAD_REQUEST).json({ error: "All required fields must be filled." });
        }

        let userAddress = await Address.findOne({ userId });

        userAddress.details[index] = {
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            pincode: zipCode,
            phone,
            altPhone: altNumber,
        };

        await userAddress.save();

        if(from === 'checkout'){
            return res.status(OK).json({ message: "Address updated successfully", redirectUrl: `/user/checkout?userId=${userId}` });
        }else{
            return res.status(OK).json({ message: "Address updated successfully", redirectUrl: '/user/address' });

        }

    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address editing error" });
    }
}

const deleteAddress = async (req,res) => {
    try {
        const userId = req.query.userId;
        const index = req.query.index;

        let userAddress = await Address.findOne({ userId : userId });

        userAddress.details.splice(index, 1);

        await userAddress.save();

        return res.status(OK).json({ message: "Address deleted successfully" });

    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
}

const loadCoupons = async (req,res)=>{
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    if(!userId){
        res.redirect('/user/login')
    }

    const user = await User.findOne({_id : userId})

    const [firstName] = user.name.split(' ');

    const coupons = await Coupon.find({});


    res.render('user/coupons', {title : "coupons", coupons, user, firstName});
}

const loadPrivacy = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    const user = await User.findOne({_id : userId})

    const [firstName, lastName] = user.name.split(' ');

    res.render('user/privacy', {title : "Privacy settings", user, firstName})
}

const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            return res.status(UNAUTHORIZED).json({ error: "User not authenticated" });
        }

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(NOT_FOUND).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(UNAUTHORIZED).json({ error: "Old password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(OK).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "An error occurred while updating the password" });
    }
};

export default {loadOrders, loadOrderDetails, loadprofile, loadUpdateProfile, verifyOTP, sendOTP, updateProfile, loadAddress, loadAddAddress,
     loadEditAddress, editAddress, deleteAddress, loadCoupons, loadPrivacy, updatePassword, addAddress};