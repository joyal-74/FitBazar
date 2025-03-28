import { razorpay } from "../config/razorpay.js";
import Cart from "../model/cartModel.js";
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Order from "../model/orderModel.js";
import Address from "../model/addressModel.js";
import Wallet from "../model/walletModel.js";
import crypto from 'crypto';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED, CREATED } from "../config/statusCodes.js";
import generateOrderId from "../helpers/uniqueIdHelper.js";
import mongoose from "mongoose";


const loadPayments = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id: userId});
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        // Calculate cart total
        let cartTotal = 0;
        cart.items.forEach(item => {
            cartTotal += item.quantity * item.productId.price;
        });

        // Calculate delivery charge (free for orders over 499)
        const deliveryCharge = cartTotal < 499 ? 39 : 0;

        // Get coupon discount from session or default to 0
        const couponDiscount = req.session.couponDiscount || 0;

        if (req.session.couponDiscount) {
            req.session.couponDiscount = 0;
            await req.session.save();
        }

        // Calculate grand total
        const grandTotal = cartTotal + deliveryCharge - couponDiscount;

        res.render('user/payment', {
            title: "Checkout",
            user,
            cart,
            cartTotal,
            deliveryCharge,
            grandTotal,
            couponDiscount
            
        });
    } catch (error) {
        console.error('Error loading payment:', error);
        res.redirect('/NOT_FOUND');
    }
}



const createRazorpayOrder = async (req, res) => {
    try {
        const { totalPrice } = req.body;

        const options = {
            amount: totalPrice * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
};


const verifyPayment = (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const hmac = crypto.createHmac('sha256', process.env.RAZOR_API_SECRET);
        hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpaySignature) {
            console.log('Payment verified');
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
};


const paymentSuccess = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { couponApplied, paymentMethod, totalPrice, razorpayPaymentId } = req.body;

        if (!paymentMethod) {
            return res.status(400).json({ error: "Payment method is required." });
        }

        const addressId = req.session.deliveryAddress;
        if (!addressId) {
            return res.status(400).json({ error: "Delivery address not found." });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty." });
        }

        const orderItemCount = cart.items.length;

        const address = await Address.findOne(
            { 'details._id': addressId },
            { details: { $elemMatch: { _id: addressId } } }
        );

        if (!address) {
            return res.status(404).json({ error: 'Address not found.' });
        }

        const customer = address.details[0].name;

        for (const item of cart.items) {
            const product = await Products.findById(item.productId._id);
            if (product) {
                const selectedVariant = await Products.findOneAndUpdate(
                    {
                        _id: product._id,
                        'variants.color': item.variants.color,
                        'variants.weight': item.variants.weight,
                        'variants.stock': { $gte: item.quantity }
                    },
                    { $inc: { 'variants.$.stock': -item.quantity } },
                    { new: true }
                );

                if (!selectedVariant) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        error: `Insufficient stock for "${product.name}".`
                    });
                }
            }
        }

        for (const item of cart.items) {
            const orderId = generateOrderId();
            const order = new Order({
                userId,
                orderId,
                product: item.productId._id,
                name: item.productId.name,
                customer,
                quantity: item.quantity,
                price: item.productId.price,
                variant: item.variants,
                brand: item.productId.brand,
                productImage: item.productImage,
                totalPrice,
                paymentMethod,
                address: addressId,
                status: 'Pending',
                paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Paid',
                statusHistory: [{ status: 'Pending', timestamp: new Date() }],
                couponApplied,
                orderItemCount
            });
            await order.save({ session });

            if (paymentMethod !== 'cod') {
                const transaction = new Wallet({
                    userId,
                    type: 'debit',
                    amount: item.quantity * item.productId.price,
                    paymentMethod,
                    paymentId: razorpayPaymentId,
                    orderId,
                    status: 'Success'
                });
                await transaction.save({ session });
            }
        }

        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId).session(session);
            if (user.wallet < totalPrice) {
                return res.status(400).json({ error: "Insufficient wallet balance." });
            }

            await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: -totalPrice } },
                { session }
            );
        }

        await Cart.findByIdAndDelete(cart._id, { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: paymentMethod === 'cod'
                ? 'Order placed successfully.'
                : 'Payment successful and order placed successfully.'
        });
    } catch (error) {
        console.error("Order Creation Error:", error);
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({ error: "Internal server error." });
    }
};


export default { loadPayments, createRazorpayOrder, paymentSuccess, verifyPayment };