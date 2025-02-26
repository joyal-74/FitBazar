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
    createdAt : {
        type : Date,
        default : Date.now,
        required : true,
    },
    couponApplied : {
        type : Boolean,
        default : false
    }
})

const Order = mongoose.model("User", orderSchema)

export default Order;