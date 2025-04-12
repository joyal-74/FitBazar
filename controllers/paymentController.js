import { razorpay } from "../config/razorpay.js";
import Cart from "../model/cartModel.js";
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Order from "../model/orderModel.js";
import Address from "../model/addressModel.js";
import Wallet from "../model/walletModel.js";
import crypto from 'crypto';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } from "../config/statusCodes.js";
import generateOrderId from "../helpers/uniqueIdHelper.js";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

const loadPayments = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id: userId});
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

        if (req.session.couponDiscount) {
            req.session.couponDiscount = 0;
            await req.session.save();
        }

        grandTotal = cartTotal + deliveryCharge - couponDiscount;

        res.render('user/payment', {title: "Checkout", user, cart, cartTotal, deliveryCharge, grandTotal, couponDiscount});
    } catch (error) {
        console.error('Error loading payment:', error);
        
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
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to create order' });
    }
};

function generateTxnId(prefix = 'TXN') {
    const id = nanoid(10).toUpperCase();
    return `${prefix}-${id}`;
}

const paymentSuccess = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        if (!userId) {
            await session.abortTransaction();
            return res.status(UNAUTHORIZED).json({ error: "Unauthorized. Please log in." });
        }

        const { couponApplied, paymentMethod, totalPrice, razorpayPaymentId } = req.body;

        const addressId = req.session.deliveryAddress;
        if (!addressId) {
            await session.abortTransaction();
            return res.status(BAD_REQUEST).json({ error: "Delivery address not found." });
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

        const shoppingAddress = address?.details?.[0]
        const orderItemCount = cart.items.length;
        const createdOrders = [];
        let itemTotal = 0;

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
            itemTotal += item.price;
        }

        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId).session(session);
            if (user.wallet < totalPrice) {
                await session.abortTransaction();
                return res.status(BAD_REQUEST).json({ error: "Insufficient wallet balance." });
            }
            
            await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: -totalPrice } },
                { session }
            );
        }

        for (const item of cart.items) {
            const orderId = generateOrderId();
            const delivery = itemTotal > 499 ? 0 : 39;
            const productTotal = item.price * item.quantity;
            const coupon = couponApplied / orderItemCount;
            const discountPrice = productTotal - coupon + delivery;

            const orderData = {
                userId,
                orderId,
                address: shoppingAddress,
                product: item.productId._id,
                quantity: item.quantity,
                price: productTotal,
                variant: item.variants,
                discountPrice,
                paymentMethod,
                paymentStatus : 'Pending',
                status: 'Pending',
                paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Paid',
                statusHistory: [{ status: 'Pending', timestamp: new Date() }],
                coupon,
                delivery,
                orderItemCount
            };

            if (paymentMethod !== 'cod') {
                orderData.paymentId = razorpayPaymentId;
                orderData.paymentStatus = 'Paid';
            }

            const order = new Order(orderData);
            await order.save({ session });
            createdOrders.push(order);

            const transactionId = generateTxnId()

            await Wallet.create({
                userId,
                address : shoppingAddress,
                orderId,
                transactionId, 
                payment_type: paymentMethod,
                type:'product_purchase',
                amount: discountPrice,
                status: paymentMethod === 'cod' ? 'Pending' : 'Paid',
                entryType : 'DEBIT',
            });
        }

        await Cart.findByIdAndDelete(cart._id).session(session);

        await session.commitTransaction();

        return res.status(OK).json({
            success: true,
            message: paymentMethod === 'cod' 
                ? 'Order placed successfully. Payment pending.' 
                : 'Payment successful and order confirmed.',
            orders: createdOrders.map(order => order.orderId)
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Order Processing Error:", error);
        
        return res.status(INTERNAL_SERVER_ERROR).json({ 
            error: "Internal server error.",
        });
    } finally {
        session.endSession();
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

const paymentFailed = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            console.error('User ID is missing in session.');
            return res.status(BAD_REQUEST).render('error', { title: "Error", message: 'Invalid session. Please log in again.' });
        }

        const latestOrder = await Order.findOne({ userId })
            .sort({ createdAt: -1 })
            .select('orderItemCount');
            

        if (!latestOrder) {
            console.error('No order found for user.');
            return res.status(BAD_REQUEST).render('error', { title: "Error", message: 'No recent order found.' });
        }

        const orderItemCount = req.session.orderItemCount;

        const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(orderItemCount);

        if (orders.length > 0) {
            await Promise.all(
                orders.map(async (order) => {
                    order.paymentStatus = 'Failed';
                    await order.save();
                })
            );
        }

        if (!orders.length) {
            console.error('No matching orders found.');
            return res.status(BAD_REQUEST).render('error', { title: "Error", message: 'No matching orders found.' });
        }

        return res.status(OK).json({message :'payment failed', redirectUrl : '/user/payment-failed'})
    } catch (err) {
        console.error('Error handling payment failure:', err);
        res.status(INTERNAL_SERVER_ERROR).render('error', { title: "Error", message: 'Error processing payment failure' });
    }
};

const loadPaymentFailed = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    const user = await User.findById(userId);

    res.render('user/paymentFailed', {title : "Payment Failed", user});
}


export default { loadPayments, createRazorpayOrder, paymentSuccess, verifyPayment, paymentFailed, loadPaymentFailed };