import mongoose from "mongoose";
import Products from './productModel.js' 
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    items : [{
        productId : {
            type : Schema.Types.ObjectId,
            ref : "Products",
            required : true,
        },
        name : {
            type : String,
            required : true
        },
        brand : {
            type : String,
            required : true
        },
        quantity : {
            type : Number,
            default : 1,
        },
        price : {
            type : Number,
            required : true,
        },
        stock : {
            type : String,
        },
        variants : {
            type : String
        },
        productImage : {
            type : String,
            required : false,
        },
    }]
},{timestamps: true});

const Cart = mongoose.model("Cart", cartSchema)

export default Cart;