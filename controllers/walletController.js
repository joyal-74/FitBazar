import User from "../model/userModel.js";
import { razorpay } from "../config/razorpay.js";
import crypto from 'crypto'; 
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST, UNAUTHORIZED } from '../config/statusCodes.js'
import Wallet from "../model/walletModel.js";
import Address from "../model/addressModel.js";
import {nanoid} from 'nanoid';

const loadWallet = async(req, res) =>{
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if(!userId){
            return res.status(UNAUTHORIZED).json({message : 'Please login to continue..!'})
        }

        const user = await User.findOne({ _id : userId, isBlocked : false});

        const lastTransaction = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
        // console.log(lastTransaction);
        

        const [firstName] = user.name.split(" ");

        res.render('user/wallet', {title : 'Wallet page', user, firstName, lastTransaction})
    } catch (error) {
        
    }
}

// add money to wallet

const createRazorpayWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        // console.log(req.body);

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        return res.json({ success: true,orderId: order.id,amount: order.amount, currency: order.currency });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to create order' });
    }
};


const verifyWalletPayment = (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(BAD_REQUEST).json({ success: false, error: 'Missing required parameters' });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZOR_API_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        const isValidSignature = crypto.timingSafeEqual(
            Buffer.from(generatedSignature, 'utf-8'),
            Buffer.from(razorpay_signature, 'utf-8')
        );

        if (isValidSignature) {
            // console.log('Payment successfully verified:', razorpay_payment_id);
            return res.json({ success: true, message: 'Payment verified', razorpay_payment_id });
        } else {
            console.warn('Payment verification failed:', razorpay_payment_id);
            return res.status(BAD_REQUEST).json({ success: false, error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return res.status(INTERNAL_SERVER_ERROR).json({ success: false, error: 'Payment verification failed' });
    }
};

function generateTxnId(prefix = 'TXN') {
    const id = nanoid(10).toUpperCase();
    return `${prefix}-${id}`;
}

const moneyAddWallet = async (req,res) => {

    try {
        const { amount, paymentMethod, razorpay_payment_id } = req.body;
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const addresses = await Address.findOne({ userId: userId });
        const userAddress = addresses?.details[0];
        // console.log(userAddress);

    
        await User.findByIdAndUpdate({_id : userId}, 
            {$inc: {wallet : amount }}, 
            { new: true })
        
        const transactionId = generateTxnId();

        await Wallet.create({
            userId,
            address : userAddress,
            transactionId : transactionId, 
            payment_type: paymentMethod,
            type : 'add_money',
            amount: amount,
            status: 'Paid',
            entryType : 'CREDIT',
        });

        return res.status(OK).json({ success: true, message : 'Payment successful and wallet updated' });
    } catch (error) {
        console.error("Error adding money to wallet:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
}


export const loadTransactions = async (req, res) => {
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 7;

    const skip = (page - 1) * limit;

    let matchConditions = {};

    if (filter) {
        matchConditions.type = filter;
    }

    if (search) {
        matchConditions.$or = [
            { transactionId: { $regex: search, $options: 'i' } },
            { payment_type: { $regex: search, $options: 'i' } },
            { 'userId.name': { $regex: search, $options: 'i' } }  
        ];
    }

    try {
        const walletData = await Wallet.aggregate([
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
            { $match: matchConditions },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        const totalCount = await Wallet.countDocuments(matchConditions);

        const totalPages = Math.ceil(totalCount / limit);

        res.render('admin/transactions', {
            title : 'Transactions',
            wallet: walletData,
            selectedFilter: filter,
            searchVal: search,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.error(error);
        res.status(INTERNAL_SERVER_ERROR).send('Server Error');
    }
};

const loadTransactionDetails = async (req,res) => {
    const {walletId} = req.query
    const wallet = await Wallet.findOne({_id : walletId}).populate('userId')

    const addressId = wallet.address
    
        const addresses = await Address.findOne(
            { 'details._id': addressId },
            { details: { $elemMatch: { _id: addressId } } }
        );
    
        const address = addresses?.details?.[0] || null; 

    res.render('admin/transactionDetails', {title : "Wallet management", wallet, address });
}

export default {loadWallet, createRazorpayWallet, verifyWalletPayment, moneyAddWallet,
    loadTransactions, loadTransactionDetails
}