import mongoose from "mongoose";
const {Schema} = mongoose;

const productSchema = new Schema({
    name : {
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
        required : true
    },
    size : {
        type : String,
        required : true
    },
    weight : {
        type : String,
        required : true,
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
    }
},{timestamps : true})


const Products = mongoose.model("Products", productSchema)

export default Products;