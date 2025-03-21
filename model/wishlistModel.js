import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    color: {
        type: String
    },
    weight: {
        type: String
    }
}, { timestamps: true });


const Wishlist = mongoose.model("Wishlist", wishlistSchema)

export default Wishlist;