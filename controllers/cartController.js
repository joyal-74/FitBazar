
import User from "../model/userModel.js";

const loadCart = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/cart', {title : "Cart", user});
}

const loadCheckout = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/checkout', {title : "Checkout", user});
}

const loadPayments = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/payment', {title : "Checkout", user});
}

const confirmOrder = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/confirmOrder', {title : "Checkout", user});
}

export default {loadCart, loadCheckout, loadPayments, confirmOrder};