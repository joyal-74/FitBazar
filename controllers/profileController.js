import bcrypt from "bcryptjs";
import User from "../model/userModel.js";


const loadprofile = async (req,res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    const [firstName, lastName] = user.name.split(' ')
    res.render('user/profile',{title : "User Pofile", user, firstName, lastName })
}

const loadAddress = async (req,res)=>{

    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/address', {title : "Address", user})
}

const loadAddAddress = async (req,res)=>{

    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/addAddress', {title : "Address", user})
}

const loadCoupons = async (req,res)=>{
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/coupons', {title : "coupons", user})
}

const loadPrivacy = async (req,res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/privacy', {title : "coupons", user})
}

export default {loadprofile, loadAddress, loadAddAddress, loadCoupons, loadPrivacy};