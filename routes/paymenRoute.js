import express from 'express';
import paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.get('/', paymentController.loadPayments);
router.post('/razorpay', paymentController.createRazorpayOrder);
router.post('/', paymentController.paymentSuccess);
router.post('/verify', paymentController.verifyPayment);
router.post('/retry-payment/:orderId', paymentController.retryPayment )
router.post('/retry-success', paymentController.retrySuccess );

export default router;
