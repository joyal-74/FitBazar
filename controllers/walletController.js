import User from "../model/userModel.js"

const loadWallet = async(req, res) =>{
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({_id : userId})

        const [firstName] = user.name.split(" ");

        res.render('user/wallet', {title : 'Wallet page', user, firstName})
    } catch (error) {
        
    }
}

// add money to wallet

const createRazorpayWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        console.log(req.body);
        

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
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
};


const verifyWalletPayment = (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZOR_API_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        const isValidSignature = crypto.timingSafeEqual(
            Buffer.from(generatedSignature, 'utf-8'),
            Buffer.from(razorpay_signature, 'utf-8')
        );

        if (isValidSignature) {
            console.log('Payment successfully verified:', razorpay_payment_id);
            return res.json({ success: true, message: 'Payment verified' });
        } else {
            console.warn('Payment verification failed:', razorpay_payment_id);
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
};



const moneyAddWallet = async (req,res) => {

    try {
        const { amount } = req.body;
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    
        await User.findByIdAndUpdate({_id : userId}, {$inc: {wallet : amount }}, { new: true })
        return res.status(200).json({ success: true, message : 'Payment successful and wallet updated' });
    } catch (error) {
        console.error("Error adding money to wallet:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}



export default {loadWallet, createRazorpayWallet, verifyWalletPayment, moneyAddWallet}