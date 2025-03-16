import mongoose from "mongoose";
const {Schema} = mongoose;
import { v4 as uuidv4 } from 'uuid';


const orderSchema = new Schema({
    orderId : {
        type : String,
    },
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
    },
    orderItems : [{
        product : {
            type : Schema.Types.ObjectId,
            ref : "Products",
        },
        quantity : {
            type : Number,
            required : true,
        },
        price : {
            type : Number,
            default : 0
        },
        name : {
            type : String,
            required : true
        },
        brand : {
            type : String,
        },
        variants : {
            type : String
        },
        productImage : {
            type : String
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
    address : {
        type : Schema.Types.ObjectId,
        ref : 'Address',
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
    },
    paymentMethod : {
        type : String
    }
},{timestamps: true})

const Order = mongoose.model("Order", orderSchema)

export default Order;