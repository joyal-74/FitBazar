import mongoose from "mongoose";
const {Schema} = mongoose;



const orderSchema = new Schema({
    orderId: {
        type: String,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: "Products",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    customer : {
        type : String
    },
    brand: {
        type: String,
    },
    variant: {
        color: { type: String },
        weight: { type: String }
    },
    productImage: {
        type: String,
        required : true
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    paymentStatus : {
        type: String,
        required : true,
        enum: ['Pending', 'Paid','Failed']
    },
    status : {
        type : String,
        enum: ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled','Returned'] 
    },
    paymentId : {
        type: String,
    },
    cancelReason : {
        type : String
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'card', 'wallet', 'netbanking']
    },
    orderItemCount: { 
        type: Number,
        required: true 
    },
    statusHistory: [{
        status: { 
            type: String,
            required: true,
            enum: ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled','Returned'] 
        },
        timestamp: { 
            type: Date, 
            default: Date.now 
        }
    }],
}, { timestamps: true });



const Order = mongoose.model("Order", orderSchema)

export default Order;