import mongoose from "mongoose";
import Products from './productModel.js'
const { Schema } = mongoose;

const cartItemSchema = new Schema({
    name: { 
        type: String,
        required: true 
    },
    brand: {
        type: String, 
        required: true 
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true },
    stock: {
        type: Number,
        required: true
    },
    variants: {
        color: {
            type: String,
            default: null
        },
        weight: {
            type: String,
            default: null
        }
    },
    productImage: {
        type: String,
        required: true
    }
});

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema]
}, { timestamps: true });


const Cart = mongoose.model("Cart", cartSchema)

export default Cart;