import bcrypt from "bcryptjs";
import User from "../model/userModel.js";
import { OK, NOT_FOUND, UNAUTHORIZED, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'


const loadPrivacy = async (req,res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    const user = await User.findOne({ _id : userId, isBlocked : false});

    if(!user){
        return res.redirect('/')
    }

    const [firstName] = user.name.split(' ');

    res.render('user/privacy', {title : "Privacy settings", user, firstName})
}

const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        console.log(req.body)
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if (!userId) {
            return res.status(UNAUTHORIZED).json({ error: "User not authenticated" });
        }

        const user = await User.findOne({ _id : userId, isBlocked : false});
        if (!user) {
            return res.status(NOT_FOUND).json({ error: "User not found" });
        }

        if (user.googleId) {
            return res.status(FORBIDDEN).json({ error: "Cannot change password for Google login account" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(UNAUTHORIZED).json({ error: "Old password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(OK).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "An error occurred while updating the password" });
    }
};

const checkOldpassword = async (req, res) => {
    const { oldPassword } = req.body;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    if (!userId) {
        return res.status(UNAUTHORIZED).json({ valid: false });
    }

    const user = await User.findOne({ _id: userId });
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    return res.json({ valid: isMatch });
};

export default {loadPrivacy, updatePassword, checkOldpassword}