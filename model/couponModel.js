import mongoose from "mongoose";
const {Schema} = mongoose;

const couponSchema = new Schema({
    name : {
        type : String,
        required : true,
        unique : true,
    },
    createdAt : {
        type : Date,
        default : Date.now,
        required : true
    },
    expiredAt : {
        type : Date,
        required : true,
    },
    offerPrice : {
        type : Number,
        required : true,
    },
    minimumPrice : {
        type : Number,
        required : true,
    },
    isList : {
        type : Boolean,
        default : true
    },
    userId : [{
        type : Schema.Types.ObjectId,
        ref : 'User'
    }]
})


const Coupon = mongoose.Model("Coupon", couponSchema)

export default Coupon;