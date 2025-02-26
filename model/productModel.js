import mongoose from "mongoose";
const {Schema} = mongoose;

const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    brand : {
        type : String,
        required : true
    },
    category : {
        type : String,
        required : true
    },
    basePrice : {
        type : Number,
        required : true
    },
    salePrice : {
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0,
    },
    quantity : {
        type : Number,
        default: 1,
    },
    color : {
        type : String,
        required : true
    },
    variantSize : {
        type : String,
        enum : ["S","M","L","XL","XXL"],
        required : true,
        default : "M"
    },
    variantWeight : {
        type : String,
        required : true,
    },
    productImage : {
        type : [String],
        required : true,
    },
    isActive : {
        type : Boolean,
        default : true,
    },
    status : {
        type : String,
        enum : ["Available" , "Out of Stock", "Unavailable"],
        required : true,
        default : "Available",
    }
},{timestamps : true})


const Product = mongoose.model("Product", productSchema)

export default Product;