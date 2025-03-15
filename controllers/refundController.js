import Refund from '../model/refundModel.js';
import Order from '../model/orderModel.js';
import Address from '../model/addressModel.js';
import { generateInvoicePDF } from '../config/invoice.js'
import fs from 'fs';

export const requestRefund = async (req, res) => {
    const { reason } = req.body;
    const orderId = req.query.id;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    console.log(orderId, reason, userId)

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const existingRefund = await Refund.findOne({ orderId });
        if (existingRefund) {
            return res.status(400).json({ message: 'Refund already requested' });
        }

        const refund = new Refund({
            orderId,
            userId,
            reason
        });

        await refund.save();

        res.status(201).json({ message: 'Refund request submitted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const cancelOrder = async (req, res) => {
    try {
        const orderId = req.query.id;

        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel a delivered order' });
        }

        order.status = 'Cancelled';
        order.updatedAt = new Date();

        await order.save();

        return res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


const generateInvoice = async(req,res) => {
    try {

        const orderId = req.query.id;

        const order = await Order.findOne({orderId}).populate('orderItems.product');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
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
                res.status(500).json({ message: 'Error generating invoice' });
            } else {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}


export default { requestRefund, cancelOrder, generateInvoice }