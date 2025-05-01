import mongoose from "mongoose";

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
    },
    gender: {
        type: String,
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
    wallet: {
        type: Number,
        default : 0
    },
    referalCode : {
        type : String,
        unique : true,
        required : true
    },
    usedCoupons: [{
        type: Schema.Types.ObjectId,
        ref: "Coupon",
    }],
  }, { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
