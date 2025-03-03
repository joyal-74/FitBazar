import mongoose from "mongoose";
const {Schema} = mongoose;

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
    color : {
        type : String,
        required : false
    },
    size : {
        type : String,
        required : false
    },
    weight : {
        type : String,
        required : false,
    },
    material : {
        type : String,
        required : false
    },
    productImages : {
        type : [String],
        required : false,
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
    tags :{
        type : String,
    }
},{timestamps : true})


const Products = mongoose.model("Products", productSchema)

export default Products;