import Refund from '../model/refundModel.js';
import Order from '../model/orderModel.js';
import Address from '../model/addressModel.js';
import Wallet from '../model/walletModel.js';
import { generateInvoicePDF } from '../config/invoice.js'
import fs from 'fs';
import { OK, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../config/statusCodes.js'
import User from '../model/userModel.js';
import Products from '../model/productModel.js';
import { nanoid } from 'nanoid';


export const requestRefund = async (req, res) => {
    const { reason } = req.body;
    const orderId = req.query.id;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        const existingRefund = await Refund.findOne({ order : orderId });
        if (existingRefund) {
            return res.status(BAD_REQUEST).json({ message: 'Refund already requested' });
        }

        const refund = new Refund({
            order: orderId,
            userId,
            reason,
            product : order.product
        });

        await refund.save();

        res.status(CREATED).json({ message: 'Refund request submitted' });
    } catch (error) {
        console.error(error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
    }
};

// user side cancellation
export const cancelOrder = async (req, res) => {
    try {
        const orderId = req.query.id;
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const { reason } = req.body;

        if (!orderId) {
            return res.status(BAD_REQUEST).json({ message: 'Order ID is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(BAD_REQUEST).json({ message: 'Order is already cancelled' });
        }

        if (order.status === 'Delivered') {
            return res.status(BAD_REQUEST).json({ message: 'Cannot cancel a delivered order' });
        }

        order.status = 'Cancelled';
        order.updatedAt = new Date();
        order.cancelReason = reason;
        order.statusHistory.push({ status : 'Cancelled', timestamp: new Date() });

        const productId = order.product

        const product = await Products.findOne({
            _id: productId,
            variants: {
                $elemMatch: {
                    color: order.variant.color,
                    weight: order.variant.weight
                }
            }
        });

        if (product) {
            const variant = product.variants.find(v =>
                v.color === order.variant.color && v.weight === order.variant.weight
            );
        
            if (variant) {
                variant.stock += order.quantity;
                await product.save();
            }
        }

        await order.save();

        const transactionId = generateTxnId();

        await Wallet.create({
            userId,
            orderId,
            address : order.address,
            transactionId : transactionId, 
            payment_type: 'wallet',
            type : 'cancel',
            amount: order.discountPrice,
            status: 'Paid',
            entryType : 'CREDIT',
        });

        const updatedUser = await User.findOneAndUpdate(
            { _id: order.userId },
            { $inc: { wallet: Number(order.discountPrice) || 0 } },
            { new: true }
            );

            if (!updatedUser) {
            console.error('User not found for wallet refund');
            }

        return res.status(OK).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
};

const generateInvoice = async (req, res) => {
    try {

        const orderId = req.query.id;

        const order = await Order.findOne({ orderId }).populate('product');
        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        const addressId = order.address

        console.log(addressId)

        const addresses = await Address.findOne(
            { 'details._id': addressId },
            { 'details.$': 1 }
        );

        const address = addresses?.details?.[0] || null;

        const filePath = await generateInvoicePDF(order, address);

        res.download(filePath, `invoice-${order._id}.pdf`, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(INTERNAL_SERVER_ERROR).json({ message: 'Error generating invoice' });
            } else {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
    }
}

const loadReturnPage = async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { 'order.orderId': { $regex: search, $options: 'i' } },
                { 'order.userId.name': { $regex: search, $options: 'i' } } 
            ];
        }

        const refundRequests = await Refund.find(query).populate('order').populate('product').populate('userId').sort({ createdAt: -1 }).lean();

        res.render('admin/returnOrder', {title: 'Return page', refundRequests, status, search });

    } catch (error) {
        console.error('Error loading return page:', error);
        res.status(INTERNAL_SERVER_ERROR).send('Server Error');
    }
};


function generateTxnId(prefix = 'TXN') {
    const id = nanoid(10).toUpperCase();
    return `${prefix}-${id}`;
}

const updateRefundStatus = async (req, res) => {
    const orderId = req.query.id;
    const { status } = req.body;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    try {

        const refund = await Refund.findOne({ order: orderId });
        if (!refund) {
            return res.status(NOT_FOUND).json({ error: "Refund not found" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(NOT_FOUND).json({ error: "Order not found" });
        }

        const user = await User.findById(order.userId);
        if (!user) {
            return res.status(NOT_FOUND).json({ error: "User not found" });
        }

        if (status === 'Approved') {
            user.wallet += order.discountPrice;
            await user.save();

            const productId = order.product
            const variant = order.variant

            const product = await Products.findOne({
                _id: productId,
                variants: {
                    $elemMatch: {
                        color: variant.color,
                        weight: variant.weight
                    }
                }
            });

            order.status = 'Returned';

            await order.save()

            if (product) {
                const variant = product.variants.find(v =>
                    v.color === order.variant.color && v.weight === order.variant.weight
                );
            
                if (variant) {
                    variant.stock += order.quantity;
                    await product.save();
                }
            }

            refund.status = status;
            await refund.save();

            const transactionId = generateTxnId();

            await Wallet.create({
                userId,
                orderId,
                address : order.address,
                transactionId : transactionId, 
                payment_type: 'wallet',
                type : 'refund',
                amount: order.discountPrice,
                status: 'Paid',
                entryType : 'CREDIT',
            });

            return res.status(OK).json({ message: `Refund of ₹${order.discountPrice} processed successfully` });
        } else {
            refund.status = status;
            await refund.save();

            return res.status(BAD_REQUEST).json({ message: `Refund for order #${order._id} rejected` });
        }
    } catch (error) {
        console.error("Error updating refund status:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
};


export default { requestRefund, cancelOrder, generateInvoice, loadReturnPage, updateRefundStatus }