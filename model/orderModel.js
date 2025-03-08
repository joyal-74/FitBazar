import mongoose from "mongoose";
const {Schema} = mongoose;
import { v4 as uuidv4 } from 'uuid';


const orderSchema = new Schema({
    orderId : {
        type : String,
        default : () => uuidv4()
    },
    orderItems : [{
        product : {
            type : Schema.Types.ObjectId,
            ref : "Product",
            unique : true
        },
        quantity : {
            type : Number,
            required : true,
        },
        price : {
            type : Number,
            default : 0
        }
    }],
    totalPrice : {
        type : Number,
        required : true,
    },
    discount : {
        type : Number,
        default : 0,
    },
    finalAmount : {
        type : Number,
        required : true
    },
    address : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    invoiceDate : {
        type : Date,
    },
    status : {
        type : String,
        required : true,
        enum : ['Pending',"Shipped", 'Delivered','Cancelled','Return Request','Returned']
    },
    couponApplied : {
        type : Boolean,
        default : false
    }
},{timestamps: true})

const Order = mongoose.model("Order", orderSchema)

export default Order;