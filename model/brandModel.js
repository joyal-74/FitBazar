import mongoose from "mongoose";
const {Schema} = mongoose;

const brandSchema = new Schema({
    brandName : {
        type : String,
        required : true,
    },
    brandImage : {
        type : [String],
        required : true,
    },
    isActive : {
        type : Boolean,
        default : true,
    },
    createdAt : {
        type : Date,
        default : Date.now
    }
})


const Brand = mongoose.Model("Brand", brandSchema)

export default Brand;