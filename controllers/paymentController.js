import { razorpay } from "../config/razorpay.js";
import Cart from "../model/cartModel.js";
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Order from "../model/orderModel.js";
import Address from "../model/addressModel.js";
import Wallet from "../model/walletModel.js";
import crypto from 'crypto';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } from "../config/statusCodes.js";
import generateOrderId from "../helpers/uniqueIdHelper.js";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Coupon from "../model/couponModel.js";

const loadPayments = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({ _id : userId, isBlocked : false});

        if (!user) {
            return res.status(FORBIDDEN).redirect('/');
        }

        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        let cartTotal = 0;
        let deliveryCharge = 0;
        let grandTotal = 0;

        if (cart && cart.items.length > 0) {
            cartTotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
            deliveryCharge = cartTotal < 499 ? 39 : 0;
            grandTotal = cartTotal + deliveryCharge;
        }

        deliveryCharge = cartTotal < 499 ? 39 : 0;

        const couponDiscount = req.session.couponDiscount || 0;
        const couponId = req.session.couponId || "";

        console.log(couponId)

        if (req.session.couponDiscount) {
            req.session.couponDiscount = 0;
            req.session.couponId = "";
            await req.session.save();
        }

        grandTotal = cartTotal + deliveryCharge - couponDiscount;

        res.render('user/payment', {title: "Checkout", user, cart, cartTotal, deliveryCharge, grandTotal, couponDiscount, couponId, RAZOR_API_KEY: process.env.RAZOR_API_KEY});
    } catch (error) {
        console.error('Error loading payment:', error);
        
    }
}

const createRazorpayOrder = async (req, res) => {
    try {
        const { totalPrice, orderId } = req.body;

        if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
            return res.status(BAD_REQUEST).json({ success: false, error: 'Invalid amount' });
        }

        const options = {
            amount: totalPrice * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        return res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error('Razorpay Error:', error?.response?.data || error.message || error);

        const { orderId } = req.body;

        if (orderId) {
            try {
                await Order.findOneAndUpdate(
                    { orderId },
                    { paymentStatus: 'Failed' }
                );
            } catch (updateError) {
                console.error('Failed to update payment status:', updateError.message);
            }
        }

        return res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to create Razorpay order' });
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
            res.status(BAD_REQUEST).json({ success: false, error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Payment verification failed' });
    }
};


function generateTxnId(prefix = 'TXN') {
    const id = nanoid(10).toUpperCase();
    return `${prefix}-${id}`;
}

const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.session.user?.id ?? req.session.user?._id;
        const addressId = req.session.deliveryAddress;
        const { couponApplied = 0, paymentMethod, couponId } = req.body;

        // console.log(req.body)

        if (!userId || !addressId) {
            await session.abortTransaction();
            return res.status(BAD_REQUEST).json({ error: "Missing user or address." });
        }

        const cart = await Cart.findOne({ userId })
            .populate('items.productId')
            .session(session);

        if (!cart || cart.items.length === 0) {
            await session.abortTransaction();
            return res.status(BAD_REQUEST).json({ error: "Cart is empty." });
        }

        const address = await Address.findOne(
            { 'details._id': new mongoose.Types.ObjectId(addressId) },
            { 'details.$': 1 }
        ).session(session);

        if (!address?.details?.[0]) {
            await session.abortTransaction();
            return res.status(NOT_FOUND).json({ error: 'Address not found.' });
        }

        const shoppingAddress = address.details[0];
        const orderId = generateOrderId();
        let itemTotal = 0;
        const orderItems = [];

        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId).session(session);
            const tempTotal = cart.items.reduce((acc, item) => {
                return acc + (item.price * item.quantity);
            }, 0);
            const delivery = tempTotal > 499 ? 0 : 39;
            const totalPayable = tempTotal - couponApplied + delivery;
        
            if (user.wallet < totalPayable) {
                await session.abortTransaction();
                return res.status(BAD_REQUEST).json({ error: "Insufficient wallet balance." });
            }
        }

        for (const item of cart.items) {
            const product = await Products.findById(item.productId._id).session(session);
            if (!product) {
                await session.abortTransaction();
                return res.status(NOT_FOUND).json({ error: `Product ${item.productId.name} not found.` });
            }

            const variantUpdate = await Products.findOneAndUpdate(
                {
                    _id: product._id,
                    'variants.color': item.variants.color,
                    'variants.weight': item.variants.weight,
                    'variants.stock': { $gte: item.quantity }
                },
                { $inc: { 'variants.$.stock': -item.quantity } },
                { new: true, session }
            );

            if (!variantUpdate) {
                await session.abortTransaction();
                return res.status(BAD_REQUEST).json({
                    error: `Insufficient stock for "${product.name}" (${item.variants.color}, ${item.variants.weight}).`
                });
            }

            const productTotal = item.price * item.quantity;
            itemTotal += productTotal;

            orderItems.push({
                product: item.productId._id,
                quantity: item.quantity,
                basePrice: item.basePrice,
                discountPrice: item.price,
                finalPrice: item.price * item.quantity,
                variant: item.variants,
                statusHistory: [{ status: 'Placed', timestamp: new Date() }],
                currentStatus : 'Placed'
            });
        }

        const deliveryCharge = itemTotal > 499 ? 0 : 39;

        const order = new Order({
            userId,
            orderId,
            address: shoppingAddress,
            orderItems,
            deliveryCharge,
            coupon: couponApplied,
            paymentStatus: 'Pending',
            paymentMethod,
        });

        if(couponId){
            await Coupon.findByIdAndUpdate(couponId, {
                $push: { usersUsed: userId },
                $inc: { used: 1 }
            });
        }

        await order.save({ session });
        await session.commitTransaction();

        return res.status(CREATED).json({
            success: true,
            message: "Order created. Proceed to payment.",
            orderId: order.orderId
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Order Creation Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    } finally {
        session.endSession();
    }
};


const paymentSuccess = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orderId, razorpayPaymentId, paymentMethod } = req.body;
        const userId = req.session.user?.id ?? req.session.user?._id;

        const order = await Order.findOne({ orderId, userId }).session(session);
        if (!order) {
            await session.abortTransaction();
            return res.status(NOT_FOUND).json({ error: "Order not found." });
        }

        const itemTotal = order.orderItems.reduce((acc, item) => acc + item.discountPrice, 0);
        const totalPayable = itemTotal - (order.coupon || 0) + (order.delivery || 0);

        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId).session(session);
            if (user.wallet < totalPayable) {
                await session.abortTransaction();
                return res.status(BAD_REQUEST).json({ error: "Insufficient wallet balance." });
            }

            await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: -totalPayable } },
                { session }
            );
        }

        order.paymentStatus = 'Paid';
        order.paymentId = razorpayPaymentId || null;
        await order.save({ session });

        const transactionId = generateTxnId();
        if(paymentMethod !== 'cod'){
            await Wallet.create({
                userId,
                orderId,
                transactionId,
                payment_type: paymentMethod,
                type: 'product_purchase',
                amount: totalPayable,
                status: 'Paid',
                entryType: 'DEBIT',
                address: order.address,
            });
        }

        await Cart.findOneAndDelete({ userId }).session(session);

        await session.commitTransaction();
        return res.status(OK).json({
            success: true,
            message: "Payment successful and order confirmed.",
            orderId
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Payment Success Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    } finally {
        session.endSession();
    }
};

const paymentFailed = async (req,res) => {
    try {
        const { orderId, reason } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        order.paymentStatus = 'Failed';
        order.failureReason = reason;
        await order.save();

        res.status(OK).json({ message: 'Payment status updated to failed' });
    } catch (error) {
        console.error('Error updating failed payment:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
}



const loadPaymentFailed = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    const user = await User.findOne({ _id : userId, isBlocked : false});

    res.render('user/paymentFailed', {title : "Payment Failed", user});
}


const retryPayment = async (req, res) => {
    try {
        const {amount} = req.body;
        const order = await Order.findById(req.params.orderId).populate('userId');

        if (!order || order.paymentStatus === 'Paid') {
            return res.status(BAD_REQUEST).json({ error: 'Invalid or already paid order.' });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: order.orderId,
            notes: {
                orderId: order._id.toString(),
                userId: order.userId._id.toString()
            }
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            razorpayOrder,
            key: process.env.RAZOR_API_KEY,
            user: {
                name: order.userId.name,
                email: order.userId.email
            }
        });
    } catch (error) {
        console.error("Retry Payment Error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Retry payment failed.' });
    }
};


const retrySuccess = async (req, res) => {
    const { orderId, paymentId } = req.body;
    const userId = req.session.user?.id ?? req.session.user?._id;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(NOT_FOUND).send('Order not found.');

        const itemTotal = order.orderItems.reduce((acc, item) => acc + item.discountPrice, 0);
        const totalPayable = itemTotal - (order.coupon || 0) + (order.delivery || 0);

        order.paymentStatus = 'Paid';
        order.failureReason = null;
        order.paymentId = paymentId;

        await order.save();

        const transactionId = generateTxnId();

        await Wallet.create({
            userId,
            orderId,
            transactionId,
            payment_type: 'netbanking',
            type: 'product_purchase',
            amount: totalPayable,
            status: 'Paid',
            entryType: 'DEBIT',
            address: order.address,
        });

        return res.status(OK).json({message : 'Payment success order updated'})

    } catch (err) {
        console.error('Payment success handler error:', err);
        res.status(INTERNAL_SERVER_ERROR).send('Payment verification failed.');
    }
};

export default { loadPayments, createRazorpayOrder, createOrder, paymentSuccess, verifyPayment, paymentFailed, loadPaymentFailed, retryPayment, retrySuccess };