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
    offer : {
        type : Number,
        default : 0
    },
    visibility : {
        type : Boolean,
        default : true,
    },
    itemsCount : {
        type : Number,
        default : 0,
    }
},{ timestamps: true })

const Category = mongoose.model("Category", categorySchema)

export default Category;