import bcrypt from "bcryptjs";
import Admin from "../model/adminModel.js";
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'
import Address from "../model/addressModel.js";


// Login Page Handler
function loadLogin(req, res) {
    res.render('admin/login', { title: 'Admin Login Page', errorMessage: "" });
}

const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    let errorMessage = "";

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            errorMessage = "Invalid email or password";
            return res.render('admin/login', { title: "Login Page", errorMessage });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            errorMessage = "Invalid email or password";
            return res.render('admin/login', { title: "Login Page", errorMessage });
        }

        req.session.admin = admin;

        return res.render('admin/dashboard', { title: "dashboard", errorMessage: "" });

    } catch (err) {
        console.error(err);
        errorMessage = "Internal server error";
        return res.render('admin/login', { title: "Login Page", errorMessage });
    }
};

const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Error logging out.");
        res.clearCookie("connect.sid").redirect("/admin/login");
    });
};



const loadDashboard = (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        errorMessage: "",
        admin: req.session.admin
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

        // Filter Logic
        if (status) {
            query.status = status;
        }

        const totalProducts = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch Orders based on Query
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
        res.status(500).send('Server Error');
    }

};



const viewOrders = async (req, res) => {
    const orderId = req.query.id;
    console.log(orderId);
    
    const order = await Order.findOne({ orderId }).populate('userId', 'name');
    // console.log(order);

    const addressId = order.address

    console.log(addressId)

    const addresses = await Address.findOne(
        { 'details._id': addressId },
        { details: { $elemMatch: { _id: addressId } } }
    );

    const address = addresses?.details?.[0] || null;
    console.log(address);
    

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
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        order.cancelReason = cancelReason;
        order.statusHistory.push({ status, timestamp: new Date() });
        order.updatedAt = new Date();
        await order.save();

        res.status(200).json({ message: 'Status updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error });
    }
}




function loadCustomers(req, res) {
    res.render('admin/customers', { title: 'Customers', errorMessage: "" });
}


export default { loadLogin, adminLogin, loadDashboard, updateStatus, loadOrders, viewOrders, loadCustomers, logout }