import mongoose, { Types } from "mongoose";
const {Schema} = mongoose;

const variantSchema = new mongoose.Schema({
    color: { type: String, required: true },
    weight: { type: String},
    stock: { type: Number, required: true },
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
    shortDescription : {
        type : String,
        required : false
    },
    description : {
        type : String,
        required : true
    },
    productSpec : {
        type : String
    },
    brand : {
        type : String,
        required : true
    },
    category : {
        type : Types.ObjectId,
        ref : 'Category',
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    images: {
        type : [String],
        required : true
    },
    productOffer : {
        type : Number,
        default : 0,
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