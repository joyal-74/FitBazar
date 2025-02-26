import mongoose from "mongoose";
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
            ref : "Product",
            required : true,
        },
        quantity : {
            type : Number,
            default : 1,
        },
        price : {
            type : Number,
            required : true,
        },
        status : {
            type : String,
            default : "placed",
        },
        color : {
            type : String,
            required : true
        },
        variantSize : {
            type : String,
            enum : ["S","M","L","XL","XXL"],
            required : false,
            default : "M"
        },
        variantWeight : {
            type : String,
            required : false,
        },
        productImage : {
            type : [String],
            required : true,
        },
    }]
})

const Cart = mongoose.model("Cart", cartSchema)

export default Cart;