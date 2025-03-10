import mongoose from "mongoose";
const {Schema} = mongoose;

const variantSchema = new Schema({
    attributeName: String,
    attributeValue: String,
    images: [String],
});

const productSchema = new Schema({
    productId : {
        type : String,
        unique : true,
    },
    name : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    specifications : {
        type : String,
        required : false
    },
    brand : {
        type : String,
        required : true
    },
    category : {
        type : String,
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0,
    },
    stock :{
        type : Number,
        required : false,
        default : 1,
    },
    quantity : {
        type : Number,
        default: 1,
    },
    visibility : {
        type : Boolean,
        default : true,
    },
    status : {
        type : String,
        enum : ["Available" , "Out of Stock", "Unavailable"],
        required : false,
        default : "Available",
    },
    variants: [variantSchema],

},{timestamps : true})


const Products = mongoose.model("Products", productSchema)

export default Products;