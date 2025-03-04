import mongoose from "mongoose";
const {Schema} = mongoose;

const categorySchema = new Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    thumbnail : {
        type : String,
        required : false
    },
    description : {
        type : String,
        required : true,
    },
    visibility : {
        type : Boolean,
        default : true,
    },
    categoryOffer : {
        type : Number,
        default : 0,
    },
    itemsCount : {
        type : Number,
        default : 0,
    },
    attributes : {
        sizes : [String],
        weights : [String]
    }
},{ timestamps: true })

const Category = mongoose.model("Category", categorySchema)

export default Category;