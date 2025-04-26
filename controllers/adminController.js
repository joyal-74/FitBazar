import bcrypt from "bcryptjs";
import Admin from "../model/adminModel.js";
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, UNAUTHORIZED } from '../config/statusCodes.js'
import Address from "../model/addressModel.js";
import Refund from "../model/refundModel.js";


// Login Page Handler
function loadLogin(req, res) {
    try {
        res.render('admin/login', { title: 'Admin Login Page' });
    } catch (error) {
        console.log(error)
    }
}

const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(UNAUTHORIZED).json({error : "Admin not found Successfull...!"});
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(UNAUTHORIZED).json({error : "Email or password is Incorrect...!"});
        }

        req.session.admin = admin;

        return res.status(OK).json({message : "Admin Login Successfull...!"});

    } catch (err) {
        console.error(err);
        return res.render('admin/login', { title: "Login Page" });
    }
};

const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(INTERNAL_SERVER_ERROR).send("Error logging out.");
        res.clearCookie("connect.sid").redirect("/admin/login");
    });
};


const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        const { status, search } = req.query;

        let query = {
            paymentStatus: { $ne: 'Failed' }
        };

        // Search Logic
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { customer : { $regex: search, $options: 'i' } },
            ];
        }

        if (status) {
            query.status = status;

        }

        const totalProducts = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const orders = await Order.find(query)
            .populate('userId')
            .populate('orderItems.product')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.render('admin/orders', {
            title : "Order managemnet",
            orders,
            status: req.query.clear ? '' : status,
            search: req.query.clear ? '' : search,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(INTERNAL_SERVER_ERROR).send('Server Error');
    }
};


const viewOrders = async (req, res) => {
    const orderId = req.query.id;

    const order = await Order.findOne({ _id : orderId }).populate('userId').populate('orderItems.product');
    // console.log(order);
    if(!order){
        return res.status(NOT_FOUND).json({message : 'Order not found'})
    }

    const activeItems = order.orderItems.filter(item => item.currentStatus !== 'Cancelled');

    const allShipped = activeItems.length > 0 && activeItems.every(item => item.currentStatus === 'Shipped');
    const allOutForDelivery = activeItems.length > 0 && activeItems.every(item => item.currentStatus === 'Out for Delivery');
    
    const addressId = order.address

    const addresses = await Address.findOne(
        { 'details._id': addressId },
        { details: { $elemMatch: { _id: addressId } } }
    );

    const refunds = await Refund.find({ order: orderId });
    const refundMap = {};

    refunds.forEach(refund => {
        refundMap[refund.product.toString()] = refund;
    });


    const address = addresses?.details?.[0] || null; 

    res.render('admin/vieworders', { title: 'Orders', order, address, allShipped, allOutForDelivery, refundMap });
}


const updateAllOrderItemsStatus = async (req, res) => {
    try {
        const orderId = req.query.id;
        const { status } = req.body;

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.orderItems.forEach(item => {
            if (item.currentStatus === 'Cancelled') return;

            item.currentStatus = status;
            item.statusHistory.push({ status, timestamp: new Date() });
        });

        const nonCancelledStatuses = order.orderItems
            .filter(item => item.currentStatus !== 'Cancelled')
            .map(item => item.currentStatus);

        const allSame = nonCancelledStatuses.every(s => s === status);

        if (allSame) {
            order.status = status;
        }

        await order.save();

        res.json({ message: `Order items marked as ${status}` });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


async function updateStatus(req, res) {
    const { id } = req.query;
    const { productId, status, cancelReason } = req.body;

    try {
        const order = await Order.findOne({ orderId: id });
        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        const item = order.orderItems.find(item => item.product?.toString() === productId);
        if (!item) {
            return res.status(NOT_FOUND).json({ message: 'Product not found in order' });
        }

        // Add status update to history
        item.statusHistory.push({ status, timestamp: new Date() });

        item.currentStatus = status;

        if (status === 'Cancelled') {
            item.cancelReason = cancelReason;
        }

        const nonCancelledStatuses = order.orderItems
            .filter(item => item.currentStatus !== 'Cancelled')
            .map(item => item.currentStatus);

        const allSame = nonCancelledStatuses.every(s => s === status);

        if (allSame) {
            order.status = status;
        }

        order.updatedAt = new Date();
        await order.save();

        return res.status(OK).json({ message: 'Status updated successfully', order });
    } catch (error) {
        console.error(error);
        return res.status(INTERNAL_SERVER_ERROR).json({ message: 'Error updating status', error });
    }
}

export default { loadLogin, adminLogin, updateStatus, updateAllOrderItemsStatus, loadOrders, viewOrders, logout }