import mongoose from "mongoose";
const { Schema } = mongoose

// Define User Schema
const userSchema = new Schema(
  {
    name : {
      type : String,
      required : false,
      unique : false
    },
    userId : {
      type : String,
      required : true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    phone : {
      type : String,
      required : false,
      unique : true
    },
    profilePic : {
      type : String,
      required : false,
    },
    googleId :{
      type : String,
      unique : true
    },
    isBlocked : {
      type : Boolean,
      default : false,
    },
    cart : [{
      type : Schema.Types.ObjectId,
      ref : "Cart",
    }],
    wallet : {
      type : Schema.Types.ObjectId,
      ref : "wallet"
    },
    orderHistory : [{
      type : Schema.Types.ObjectId,
      ref : "Order"
    }],
    searchHistory : [{
      category : {
        type : Schema.Types.ObjectId,
        ref : "Category",
      },
      brand : {
        type : String
      },
      price : {
        type : Number,
      },
      searchOn : {
        type : Date,
        default : Date.now
      }
    }]
  },{timestamps : true}
);

// Create User Model
const User = mongoose.model("User", userSchema);

export default User;
