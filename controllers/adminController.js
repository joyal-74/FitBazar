import bcrypt from "bcryptjs";
import Admin from "../model/adminModel.js";
import { INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'


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

function loadOrders(req, res) {
    res.render('admin/orders', { title: 'Orders', errorMessage: "" });
}

function viewOrders(req, res) {
    res.render('admin/vieworders', { title: 'Order Details', errorMessage: "" });
}



function loadCustomers(req, res) {
    res.render('admin/customers', { title: 'Customers', errorMessage: "" });
}


export default { loadLogin, adminLogin, loadDashboard, loadOrders, viewOrders, loadCustomers, logout }