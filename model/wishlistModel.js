import mongoose from "mongoose";
const {Schema} = mongoose;

const whishlistSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    products : [{
        productId : {
            type : Schema.Types.ObjectId,
            ref : "products",
            requirred : true,
        },
        addedAt : {
            type : Date,
            default : Date.now,
        }
    }]
})

const Wishlist = mongoose.model("Wishlist", whishlistSchema)

export default Wishlist;