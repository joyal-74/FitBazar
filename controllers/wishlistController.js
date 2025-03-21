import User from "../model/userModel.js";
import Wishlist from "../model/wishlistModel.js";

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({_id : userId})

        if(!userId){
            res.status(401).json({error : "Please login to view wishlist"})
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
        res.status(500).json({error : "internal error"})
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { userId, productId, color, weight } = req.body;
        
        // Check if item already exists
        const existingItem = await Wishlist.findOne({ 
            userId, 
            product : productId,
            color, 
            weight 
        });

        console.log(existingItem)
        
        if (existingItem) {
            return res.status(400).json({ error: 'Item already in wishlist' });
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
        res.status(500).json({ error: 'Server error' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { wishlistId } = req.body;
        await Wishlist.findByIdAndDelete(wishlistId);
        res.json({ message: 'Item removed from wishlist' });
    } catch (error) {
        res.status(500).json({ error: 'Error removing item' });
    }
};

export default {getWishlist, removeFromWishlist, addToWishlist}