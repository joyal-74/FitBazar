import Coupon from "../model/couponModel.js";
import User from "../model/userModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, BAD_REQUEST } from '../config/statusCodes.js'

const loadCouponPage = async(req,res)=>{
    try {
        const { q, status, page = 1 } = req.query;
        const limit = 7;
        let query = {};

        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }

        if (status) {
            query.status = status === 'true' ? 'Active' : 'Inactive';
        }

        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);
        const coupons = await Coupon.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.render('admin/coupons', {
            title : "Coupons",
            coupons,
            currentPage: parseInt(page),
            totalPages,
            searchQuery: q || '',
            selectedFilter: status
        });
    } catch (err) {
        console.error(err);
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
    }
}

const addCoupon = async (req, res)=> {
    try {
        const { addName, addCode, addDescription, addStartDate, addExpiryDate, addMinPrice, addOfferPrice, addStatus, addUsageType } = req.body;
        // console.log(req.body)
   
        if (new Date(addStartDate) >= new Date(addExpiryDate)) {
            return res.status(BAD_REQUEST).json({ error: 'Expiry date must be after start date' });
        }
        if (parseFloat(addMinPrice) < parseFloat(addOfferPrice)) {
            return res.status(BAD_REQUEST).json({ error: 'Minimum price must be greater than offer price' });
        }

        await Coupon.create({
            name: addName,
            code: addCode, 
            description: addDescription,
            startDate: addStartDate,
            expiryDate: addExpiryDate,
            minPrice: addMinPrice,
            offerPrice: addOfferPrice,
            status: addStatus,
            usageType: addUsageType
        });
        
        return res.status(OK).json({ message: 'Coupon added successfully' });

    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            res.status(BAD_REQUEST).json({ error: 'Coupon name already exists' });
        } else {
            res.status(INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
        }
    }
}


const editCoupon = async (req, res) => {
    try {
        const { orgName, editName, editCode, editDescription, editStartDate, editExpiryDate, editMinPrice, editOfferPrice, editStatus, editUsageType } = req.body;

        if (new Date(editStartDate) >= new Date(editExpiryDate)) {
            return res.status(BAD_REQUEST).json({ error: 'Expiry date must be after start date' });
        }
        if (parseFloat(editMinPrice) < parseFloat(editOfferPrice)) {
            return res.status(BAD_REQUEST).json({ error: 'Minimum price must be greater than offer price' });
        }

        const coupon = await Coupon.findOneAndUpdate(
            { name: orgName },
            { 
                name: editName,
                code: editCode,
                description: editDescription,
                startDate: editStartDate,
                expiryDate: editExpiryDate,
                minPrice: editMinPrice,
                offerPrice: editOfferPrice,
                status: editStatus,
                usageType: editUsageType,
            }, 
            { new: true }
        );
        
        if (coupon) {
            return res.status(OK).json({ message: 'Coupon updated successfully' });
        } else {
            return res.status(BAD_REQUEST).json({ error : 'Coupon updated Failed' });
        }
        

        
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            res.status(BAD_REQUEST).json({ error: 'Coupon name already exists' });
        } else {
            res.status(INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
        }
    }
}

const deleteCoupon = async (req,res) => {
    try {
        const {couponName} = req.body;
        
        const coupon = await Coupon.findOneAndDelete({ name : couponName });
        if (!coupon) {
            return res.status(NOT_FOUND).json({ error: 'Coupon not found' });
        }
        res.status(OK).json({ message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
    }
}


const validateCoupon = async (req, res) => {
    try {
        const { code, total } = req.body;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            return res.status(BAD_REQUEST).json({ success: false, message: 'Invalid coupon code.' });
        }

        if (coupon.status !== 'Active') {
            return res.status(BAD_REQUEST).json({ success: false, message: 'Coupon is inactive.' });
        }

        const now = new Date();
        if (now < coupon.startDate || now > coupon.expiryDate) {
            return res.status(BAD_REQUEST).json({ success: false, message: 'Coupon has expired or is not yet active.' });
        }

        if (total < coupon.minPrice) {
            return res.status(BAD_REQUEST).json({
                success: false,
                message: `Minimum order value should be ₹${coupon.minPrice}.`
            });
        }

        if (coupon.usageType === 'single-use' && coupon.usersUsed?.includes(userId)) {
            return res.status(BAD_REQUEST).json({
                success: false,
                message: 'You have already used this coupon.'
            });
        }

        return res.status(OK).json({
            success: true,
            message: `Coupon applied! ₹${coupon.offerPrice} discount applied.`,
            discount: coupon.offerPrice,
            couponId: coupon._id
        });
    } catch (error) {
        console.error(error);
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal Server Error' });
    }
};

// user side coupon showing
const loadCoupons = async (req,res)=>{
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    if(!userId){
        res.redirect('/user/login')
    }

    const user = await User.findOne({ _id : userId, isBlocked : false});

    if(!user){
        return res.redirect('/')
    }

    const [firstName] = user.name.split(' ');

    const coupons = await Coupon.find({});


    res.render('user/coupons', {title : "coupons", coupons, user, firstName});
}

export default {loadCouponPage, addCoupon, editCoupon, deleteCoupon, validateCoupon, loadCoupons }