import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import Addresses from '../model/addressModel.js'
import Address from "../model/addressModel.js";


const loadprofile = async (req,res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    const [firstName, lastName] = user.name.split(' ')
    res.render('user/profile',{title : "User Pofile", user, firstName, lastName })
}

const loadAddress = async (req, res) => {
    const userId = req.session.user?.id || "";
    console.log(userId)

    if (!userId) return res.redirect('/user/login');

    try {
        const addresses = await Addresses.find({ userId : userId });

        res.render('user/address', {
            title: 'Manage Addresses',
            addresses,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading addresses:', error);
        res.render('user/address', { title : "address", addresses: [], user: req.session.user });
    }
};

const addAddress = async (req, res) => {
    try {
        const {
            fullName,
            phone,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            country,
            altNumber,
            addressType,
            zipCode
        } = req.body;

        const userId = req.session.user.id;

        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(400).json({ error: "All required fields must be filled." });
        }

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            // If no address document exists for the user, create a new one
            userAddress = new Address({
                userId,
                details: []
            });
        }

        const newIndex = userAddress.details.length;

        userAddress.details.push({
            index: newIndex,
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            pincode: zipCode,
            phone,
            altPhone: altNumber
        });

        await userAddress.save();

        return res.status(201).json({ message: "Address added successfully" });

    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(500).json({ error: error.message || "Address creation error" });
    }
};



const loadAddAddress = async (req,res)=>{

    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/addAddress', {title : "Address", user})
}

const loadEditAddress = async (req, res) => {
    try {
        const { id, index } = req.query;
        
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const address = await Address.findOne({ 
            userId: id,
        });

        if (!address) {
            return res.status(404).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];
        // console.log(selectedAddress);

        if (!selectedAddress) {
            return res.status(404).json({ error: "Address details not found" });
        }

        res.render('user/editaddress', { 
            title: "Edit Address",
            address: selectedAddress,
            user,
            addressId: id,
            index
        });
    } catch (error) {
        console.error("Error loading address:", error);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};


const editAddress = async (req,res) => {
    try {
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode, index } = req.body;


        const userId = req.session.user.id;

        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(400).json({ error: "All required fields must be filled." });
        }


        let userAddress = await Address.findOne({ userId });

        userAddress.details[index] = {
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            pincode: zipCode,
            phone,
            altPhone: altNumber,
        };

        await userAddress.save();

        return res.status(200).json({ message: "Address updated successfully" });

    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).json({ error: error.message || "Address editing error" });
    }
}

const deleteAddress = async (req,res) => {
    try {
        const userId = req.query.userId;
        const index = req.query.index;

        let userAddress = await Address.findOne({ userId : userId });

        userAddress.details.splice(index, 1);

        await userAddress.save();

        return res.status(200).json({ message: "Address deleted successfully" });

    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

const loadCoupons = async (req,res)=>{
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/coupons', {title : "coupons", user});
}

const loadPrivacy = async (req,res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})

    res.render('user/privacy', {title : "coupons", user})
}

export default {loadprofile, loadAddress, loadAddAddress, loadEditAddress, editAddress, deleteAddress, loadCoupons, loadPrivacy, addAddress};