import mongoose from "mongoose";
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Products",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        basePrice: {
            type: Number
        },
        discountPrice: {
            type: Number,
            required: true
        },
        variant: {
            color: { type: String },
            weight: { type: String }
        },
        cancelReason: {
            type: String
        },
        statusHistory: [{
            status: {
                type: String,
                required: true,
                enum: ['Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Payment Failed']
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
        currentStatus : {
            type : String
        },
    }],
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid', 'Failed']
    },
    paymentId: {
        type: String
    },
    coupon: {
        type: Number
    },
    deliveryCharge: {
        type: Number
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'card', 'wallet', 'netbanking']
    },
    failureReason : {
        type: String,
    },
    totalAmount : {
        type: Number,
    },
    status : {
        type: String,
        enum: ['Confirmed', 'Out for Delivery', 'Delivered']
    },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;