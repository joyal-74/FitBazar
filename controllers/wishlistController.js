import User from "../model/userModel.js";
import Wishlist from "../model/wishlistModel.js";
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED, BAD_REQUEST } from '../config/statusCodes.js'

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({ _id : userId, isBlocked : false});

        if(!userId){
            res.status(UNAUTHORIZED).json({error : "Please login to view wishlist"})
        }

        const wishlist = await Wishlist.find({ userId }).populate('product');
        
        res.render('user/wishlist', { 
            title : "Wishlist",
            wishlist,
            user,
            userId
        });
    } catch (error) {
        console.log(error)
        res.status(INTERNAL_SERVER_ERROR).json({error : "internal error"})
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { userId, productId, color, weight } = req.body;

        if(!userId){
            return res.status(UNAUTHORIZED).json({error : 'Please login to continue..!'})
        }
        
        // Check if item already exists
        const existingItem = await Wishlist.findOne({ userId, product : productId, color,  weight });

        // console.log(existingItem)
        
        if (existingItem) {
            return res.status(BAD_REQUEST).json({ error: 'Item already in wishlist' });
        }

        const wishlistItem = new Wishlist({
            userId,
            product : productId,
            color,
            weight
        });
        
        await wishlistItem.save();
        res.json({ message: 'Added to wishlist successfully' });
    } catch (error) {
        console.log(error)
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Server error' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { wishlistId } = req.body;
        await Wishlist.findByIdAndDelete(wishlistId);
        res.json({ message: 'Item removed from wishlist' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Error removing item' });
    }
};

export default { getWishlist, removeFromWishlist, addToWishlist }