import bcrypt from "bcryptjs";
import Admin from "../model/adminModel.js";
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, UNAUTHORIZED } from '../config/statusCodes.js'
import Address from "../model/addressModel.js";


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
        errorMessage = "Internal server error";
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
        let query = {};

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

    const order = await Order.findOne({ orderId }).populate('userId').populate('product','name');
    // console.log(order);
    if(!order){
        return res.status(NOT_FOUND).json({message : 'Order not found'})
    }

    const addressId = order.address

    const addresses = await Address.findOne(
        { 'details._id': addressId },
        { details: { $elemMatch: { _id: addressId } } }
    );

    const address = addresses?.details?.[0] || null; 

    res.render('admin/vieworders', { title: 'Orders', order, address });
}

async function updateStatus(req, res) {
    const { id } = req.query;
    const { status, cancelReason } = req.body;

    try {
        const updateData = { status };
        if (cancelReason) updateData.cancelReason = cancelReason;
    
        const order = await Order.findOne({ orderId: id });
        if (!order) {
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        order.status = status;
        order.cancelReason = cancelReason;
        order.statusHistory.push({ status, timestamp: new Date() });
        order.updatedAt = new Date();
        await order.save();

        res.status(OK).json({ message: 'Status updated successfully', order });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Error updating status', error });
    }
}

export default { loadLogin, adminLogin, updateStatus, loadOrders, viewOrders, logout }