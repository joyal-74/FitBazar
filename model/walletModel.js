import mongoose from "mongoose";
const {Schema} = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    transactionId : {
        type : String,
        required : true
    },
    type: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'pending'
    },
    entryType : {
        type : String,
        enum : ['CREDIT','DEBIT']
    }
},{timestamps : true});


const Wallet = mongoose.model("Wallet", walletSchema)

export default Wallet;