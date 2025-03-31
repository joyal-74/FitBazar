import Coupon from "../model/couponModel.js";


const loadCouponPage = async(req,res)=>{
    try {
        const { q, status, page = 1 } = req.query;
        const limit = 7;
        let query = {};

        // Search by name
        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }

        // Filter by status
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
        res.status(500).json({ error: 'Server Error' });
    }
}

const addCoupon = async (req, res)=> {
    try {
        const { addName, addCode, addDescription, addStartDate, addExpiryDate, addMinPrice, addOfferPrice, addStatus } = req.body;
   
        // Validation
        if (new Date(addStartDate) >= new Date(addExpiryDate)) {
            return res.status(400).json({ error: 'Expiry date must be after start date' });
        }
        if (parseFloat(addMinPrice) < parseFloat(addOfferPrice)) {
            return res.status(400).json({ error: 'Minimum price must be greater than offer price' });
        }

        const coupon = new Coupon({
            name: addName,
            code: addCode, 
            description: addDescription,
            startDate: addStartDate,
            expiryDate: addExpiryDate,
            minPrice: addMinPrice,
            offerPrice: addOfferPrice,
            status: addStatus
        });

        await coupon.save();
        res.status(200).json({ message: 'Coupon added successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            res.status(400).json({ error: 'Coupon name already exists' });
        } else {
            res.status(500).json({ error: 'Server Error' });
        }
    }
}


const editCoupon = async (req, res) => {
    try {
        const { orgName, editName, editCode, editDescription, editStartDate, editExpiryDate, editMinPrice, editOfferPrice, editStatus } = req.body;

        console.log(req.body);
        

        // Validation
        if (new Date(editStartDate) >= new Date(editExpiryDate)) {
            return res.status(400).json({ error: 'Expiry date must be after start date' });
        }
        if (parseFloat(editMinPrice) < parseFloat(editOfferPrice)) {
            return res.status(400).json({ error: 'Minimum price must be greater than offer price' });
        }

        const coupon = await Coupon.findOne({ name: orgName });

        if (coupon) {
            coupon.name = editName;
            coupon.code = editCode;
            coupon.description = editDescription;
            coupon.startDate = editStartDate;
            coupon.expiryDate = editExpiryDate;
            coupon.minPrice = editMinPrice;
            coupon.offerPrice = editOfferPrice;
            coupon.status = editStatus;
        
            await coupon.save();
        } else {
            console.log('Coupon not found');
        }

        res.status(200).json({ message: 'Coupon updated successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            res.status(400).json({ error: 'Coupon name already exists' });
        } else {
            res.status(500).json({ error: 'Server Error' });
        }
    }
}


const deleteCoupon = async (req,res) => {
    try {
        const {couponName} = req.body;
        
        const coupon = await Coupon.findOneAndDelete({ name : couponName });
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
}


export const validateCoupon = async (req, res) => {
    try {
        const { code, total } = req.body;

        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }

        // Check coupon status
        if (coupon.status !== 'Active') {
            return res.status(400).json({ success: false, message: 'Coupon is inactive.' });
        }

        // Check expiry date
        const now = new Date();
        if (now < coupon.startDate || now > coupon.expiryDate) {
            return res.status(400).json({ success: false, message: 'Coupon has expired or is not yet active.' });
        }

        // Check minimum order value
        if (total < coupon.minPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value should be ₹${coupon.minPrice}.`
            });
        }

        req.session.couponDiscount = coupon.offerPrice;

        return res.status(200).json({
            success: true,
            message: `Coupon applied! ₹${coupon.offerPrice} discount applied.`,
            discount: coupon.offerPrice
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export default {loadCouponPage, addCoupon, editCoupon, deleteCoupon, validateCoupon}