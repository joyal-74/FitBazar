import mongoose from "mongoose";
const {Schema} = mongoose;

const reviewSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    star: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
},{timestamps : true});


const Reviews = mongoose.model("Reviews", reviewSchema)

export default Reviews;