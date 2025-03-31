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
import { TextQueryHandler } from "puppeteer";
import { log } from "console";


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

        // Calculate grand total
        grandTotal = cartTotal + deliveryCharge - couponDiscount;

        console.log(grandTotal,cartTotal);

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

const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        if (!userId) {
            await session.abortTransaction();
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { couponApplied, paymentMethod, totalPrice } = req.body;

        if (!paymentMethod) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Payment method is required." });
        }

        const addressId = req.session.deliveryAddress;
        if (!addressId) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Delivery address not found." });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId').session(session);
        if (!cart || cart.items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Cart is empty." });
        }

        const orderItemCount = cart.items.length;
        const address = await Address.findOne(
            { 'details._id': addressId },
            { details: { $elemMatch: { _id: addressId } } }
        ).session(session);

        if (!address) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Address not found.' });
        }

        const customer = address.details[0].name;
        const createdOrders = [];

        // Create orders with initial Pending status
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
                paymentStatus: 'Pending',
                status : 'Pending',
                statusHistory: [{ status: 'Pending', timestamp: new Date() }],
                couponApplied,
                orderItemCount
            });
            await order.save({ session });
            createdOrders.push(order);
        }

        req.session.orderItemCount = orderItemCount

        await session.commitTransaction();
        
        return res.status(200).json({
            success: true,
            message: 'Orders created successfully',
            orders: createdOrders,
            cartId: cart._id
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Order Creation Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        session.endSession();
    }
};

const paymentSuccess = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        if (!userId) {
            await session.abortTransaction();
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { paymentMethod, totalPrice, razorpayPaymentId, cartId } = req.body;
        console.log(req.body)

        if (!paymentMethod) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Invalid request parameters." });
        }

        const orderItemCount = req.session.orderItemCount;

        // Get all orders that need to be confirmed
        const orders = await Order.find({userId}).sort({createdAt: -1}).limit(orderItemCount)

        // Check stock availability
        for (const order of orders) {
            const product = await Products.findById(order.product).session(session);
            if (!product) {
                throw new Error(`Product ${order.product} not found`);
            }

            const variantUpdated = await Products.findOneAndUpdate(
                {
                    _id: order.product,
                    'variants.color': order.variant.color,
                    'variants.weight': order.variant.weight,
                    'variants.stock': { $gte: order.quantity }
                },
                { $inc: { 'variants.$.stock': -order.quantity } },
                { new: true, session }
            );

            if (!variantUpdated) {
                throw new Error(`Insufficient stock for product ${order.name}`);
            }
        }

        // Process payment based on method
        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId).session(session);
            if (user.wallet < totalPrice) {
                throw new Error("Insufficient wallet balance.");
            }
            await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: -totalPrice } },
                { session }
            );
        } else if (paymentMethod !== 'cod') {
            for (const order of orders) {
                const transaction = new Wallet({
                    userId,
                    type: 'debit',
                    amount: order.quantity * order.price,
                    paymentMethod,
                    paymentId: razorpayPaymentId,
                    orderId: order.orderId,
                    status: 'Success'
                });
                await transaction.save({ session });
            }
        }

        // Update order statuses
        for (const order of orders) {
            order.paymentStatus = paymentMethod === 'cod' ? 'Pending' : 'Paid';
            order.statusHistory.push({
                status: 'Pending',
                timestamp: new Date()
            });
            await order.save({ session });
        }


        console.log(cartId);

        await Cart.findByIdAndDelete(cartId);
        console.log("Cart deleted successfully");

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: paymentMethod === 'cod' 
                ? 'Order placed successfully. Payment pending.' 
                : 'Payment successful and order confirmed.',
            orders: orders.map(order => order.orderId)
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Payment Confirmation Error:", error);
        
        // Try to update orders to failed status
        try {
            await Order.updateMany(
                { orderId: { $in: req.body.orderIds }, userId },
                { 
                    paymentStatus: 'Failed',
                    $push: { 
                        statusHistory: { 
                            status: 'Failed', 
                            timestamp: new Date(),
                            reason: error.message 
                        } 
                    }
                }
            );
        } catch (updateError) {
            console.error("Failed to update order status:", updateError);
        }

        return res.status(400).json({
            error: error.message || 'Payment confirmation failed',
            orders: req.body.orderIds
        });
    } finally {
        session.endSession();
    }
};

const paymentFailed = async (req, res) => {
    try {
        const { error } = req.body;
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            console.error('User ID is missing in session.');
            return res.status(400).render('error', { title: "Error", message: 'Invalid session. Please log in again.' });
        }

        const user = await User.findById(userId);

        // Find the latest orderItemCount for the user
        const latestOrder = await Order.findOne({ userId })
            .sort({ createdAt: -1 })
            .select('orderItemCount');
            

        if (!latestOrder) {
            console.error('No order found for user.');
            return res.status(400).render('error', { title: "Error", message: 'No recent order found.' });
        }

        const orderItemCount = req.session.orderItemCount;

        // Fetch all orders with the same orderItemCount
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
            return res.status(400).render('error', { title: "Error", message: 'No matching orders found.' });
        }


        return res.status(200).json({message :'payment failed', redirectUrl : '/user/payment-failed'})
    } catch (err) {
        console.error('Error handling payment failure:', err);
        res.status(500).render('error', { title: "Error", message: 'Error processing payment failure' });
    }
};

const loadPaymentFailed = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    const user = await User.findById(userId);

    res.render('user/paymentFailed', {title : "Payment Failed", user});
}

export default { loadPayments, createRazorpayOrder, paymentSuccess, verifyPayment, paymentFailed, createOrder, loadPaymentFailed};