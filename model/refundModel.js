import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Processed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    }
});

const Refund = mongoose.model('Refund', refundSchema);
export default Refund;
