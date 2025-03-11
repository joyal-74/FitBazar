import mongoose from "mongoose";
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    details: [{
        addressType: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        addressLine1 : {
            type : String,
        },
        addressLine2 : {
            type : String
        },          
        city: {
            type: String,
            required: true
        },
        landmark: {
            type: String,
            required: false
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        altPhone: {
            type: String,
            required: false
        }
    }]
}, { timestamps: true }); // Added timestamps for better tracking

const Address = mongoose.model("Address", addressSchema);
export default Address;
