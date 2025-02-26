import mongoose from "mongoose";
const {Schema} = mongoose;

const reviewSchema = new Schema({
    createdAt : {
        type : Date,
        default : Date.now,
        required : true
    },
    expiredAt : {
        type : Date,
        required : true,
    },
    userId : [{
        type : Schema.Types.ObjectId,
        ref : 'User'
    }],
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    rating: {
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
    media: [{
        type: [String],
    }],

})


const Reviews = mongoose.Model("Reviews", reviewSchema)

export default Reviews;