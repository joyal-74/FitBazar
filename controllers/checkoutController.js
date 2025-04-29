import User from "../model/userModel.js";
import Cart from "../model/cartModel.js";
import Address from "../model/addressModel.js";
import Order from "../model/orderModel.js";
import Coupon from "../model/couponModel.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED, CREATED } from "../config/statusCodes.js";


const loadCheckout = async (req, res) => {
    const userId = req.query.userId;

    const user = await User.findOne({ _id : userId, isBlocked : false});
    const address = await Address.find({ userId });
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    let cartTotal = 0;
    let deliveryCharge = 0;
    let grandTotal = 0;

    if (cart && cart.items.length > 0) {
        cartTotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        deliveryCharge = cartTotal < 499 ? 39 : 0;
        grandTotal = cartTotal + deliveryCharge;
    }

    const currentDate = new Date();

    const coupons = await Coupon.find({
        status: 'Active',
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate },
        minPrice: { $lte: grandTotal }
    });

    res.render('user/checkout', { title: "Checkout", coupons, user, address, cart, calculatedValues: {cartTotal, deliveryCharge, grandTotal }});
};


const checkoutDetails = async (req,res) => {
    const {selectedAddress} = req.body

    req.session.deliveryAddress = selectedAddress;

    res.redirect('/user/payments')
}

const addShoppingAddress = async (req,res) =>{
    try {
        const {fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode} = req.body;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if(!userId){
            return res.status(BAD_REQUEST).json("Please Login to continue")
        }

        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(BAD_REQUEST).json({ error: "All required fields must be filled." });
        }

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({ userId, details: []});
        }

        const newIndex = userAddress.details.length;

        userAddress.details.push({
            index: newIndex,userId,addressType,name: fullName,
            addressLine1,addressLine2,
            city, landmark, state,
            pincode: zipCode,
            phone, altPhone: altNumber
        });

        await userAddress.save();

        return res.status(CREATED).json({ message: "Address added successfully" , redirectUrl: `/user/checkout?userId=${userId}` });

    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address creation error" });
    }
}

const editshoppingAddress = async (req,res) =>{

    try {
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode, index } = req.body;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        let userAddress = await Address.findOne({ userId });

        userAddress.details[index] = {
            addressType, name: fullName,
            addressLine1, addressLine2,
            city, landmark,
            state, country,
            pincode: zipCode,
            phone, altPhone: altNumber,
        };

        await userAddress.save();
        return res.status(OK).json({ message: "Address updated" , redirectUrl: `/user/checkout?userId=${userId}`});


    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address editing error" });
    }
}

const loadCheckoutUp = async (req, res) => {
    try {
        const { id, index } = req.query;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({ _id : userId, isBlocked : false});

        if (!user) {
            return res.status(UNAUTHORIZED).json({ error: "Please Login to continue" });
        }

        const address = await Address.findOne({ userId: id });

        if (!address) {
            return res.status(NOT_FOUND).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];

        if (!selectedAddress) {
            return res.status(NOT_FOUND).json({ error: "Address details not found" });
        }

        res.render('user/checkout-Up', { title: "Edit Address", address: selectedAddress, user,addressId: id, index});

    } catch (error) {
        console.error("Error loading address:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};

const confirmOrder = async (req, res) => {
    try {
        
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    
        if (!userId) {
            console.error('User ID is missing in session.');
            return res.status(NOT_FOUND).render('error', { title : "error",message: 'Invalid session. Please log in again.' });
        }

        const user = await User.findOne({ _id : userId, isBlocked : false});

        const orders = await Order.find({ userId }).populate('orderItems.product').sort({ createdAt: -1 }).limit(1);

        if (!orders.length) {
            console.error('No matching orders found.');
            return res.status(NOT_FOUND).render('error', { title : "error", message: 'No matching orders found.' });
        }

        const addressId = orders[0].address;

        const address = await Address.findOne(
            { 'details._id': addressId },
            { 'details.$': 1 }
        );

        if (!address) {
            console.error('Address not found.');
            return res.status(NOT_FOUND).render('error', {title : "error", message: 'Shipping address not found.' });
        }

        const shippingAddress = address.details[0];

        return res.render('user/confirmOrder', { title : "Order Confirmation", user, shippingAddress, orders });
    } catch (error) {
        console.error(`Error confirming order: ${error}`);
        return res.status(INTERNAL_SERVER_ERROR).render('error', { title : "error", message: 'Something went wrong. Please try again later.' });
    }
};

export default { loadCheckout, addShoppingAddress, checkoutDetails, editshoppingAddress, loadCheckoutUp, confirmOrder}