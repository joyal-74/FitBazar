import bcrypt from "bcryptjs";
import Admin from "../model/adminModel.js";
import Order from "../model/orderModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'


// Login Page Handler
function loadLogin(req, res) {
    res.render('admin/login', { title: 'Admin Login Page', errorMessage: "" });
}

const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    let errorMessage = ""; // Store general error message

    // Basic validation
    if (!email || !password) {
        errorMessage = "Email and password are required";
        return res.render('admin/login', { title: "Login Page", errorMessage });
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        errorMessage = "Invalid email format";
        return res.render('admin/login', { title: "Login Page", errorMessage });
    }

    try {
        // Check if admin exists
        const admin = await Admin.findOne({ email });
        if (!admin) {
            errorMessage = "Invalid email or password";
            return res.render('admin/login', { title: "Login Page", errorMessage });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            errorMessage = "Invalid email or password";
            return res.render('admin/login', { title: "Login Page", errorMessage });
        }

        req.session.admin = admin;

        // Redirect on success
        return res.render('admin/dashboard',{ title : "dashboard", errorMessage: ""});

    } catch (err) {
        console.error(err);
        errorMessage = "Internal server error";
        return res.render('admin/login', { title: "Login Page", errorMessage });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(INTERNAL_SERVER_ERROR).send("Error logging out.");
        }
        res.clearCookie("connect.sid");
        res.redirect("/admin/login");
    });
};


function loadDashboard(req, res) {
    res.render('admin/dashboard', { title: 'Admin dashboard', errorMessage: "", admin: req.session.admin });
}

const loadOrders = async(req, res) => {
    const orders = await Order.find()
            .populate('userId', 'name') 
            .sort({ createdAt: -1 });
    res.render('admin/orders', { title: 'Orders', orders, errorMessage: "" });
}

const viewOrders = async(req, res) => {
    const orderId = req.query.id;
    const order = await Order.findOne({orderId}).populate('userId', 'name');
    console.log(order);
    
    res.render('admin/vieworders', { title: 'Orders', order, errorMessage: "" });
}

const updateStatus = async (req, res) => {
    try {
        const orderId = req.query.id;
        const { status } = req.body; 

        console.log('Order ID:', orderId); 
        console.log('New Status:', status);

        const order = await Order.findOne({ orderId }); 

        if (!order) {
            console.log('Order not found!');
            return res.status(NOT_FOUND).json({ message: 'Order not found' });
        }

        order.status = status;
        order.updatedAt = new Date(); // ✅ Update updatedAt field

        await order.save();

        res.status(OK).json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Failed to update order status' });
    }
};



function loadCustomers(req, res) {
    res.render('admin/customers', { title: 'Customers', errorMessage: "" });
}


export default { loadLogin, adminLogin, loadDashboard, updateStatus, loadOrders, viewOrders, loadCustomers, logout }