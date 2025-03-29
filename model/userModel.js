import mongoose from "mongoose";
import Cart from "./cartModel.js";

const { Schema } = mongoose

const userSchema = new Schema(
  {
    name: {
        type: String,
        required: false,
        unique: false
    },
    userId: {
        type: String,
        required: false
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
    phone: {
        type: String,
        required: false
    },
    gender: {
        type: String,
        required: false
    },
    profilePic: {
        type: String,
        required: false,
    },
    username: {
        type: String,
        required: false,
        unique : true,
        sparse : true
    },
    googleId: {
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    cart: {
        type: Schema.Types.ObjectId,
        ref: "Cart",
    },
    wallet: {
        type: Number,
        default : 0
    },
    referalCode : {
        type : String,
        unique : true,
        required : true
    },
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }]
  }, { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
