import { CREATED, INTERNAL_SERVER_ERROR, UNAUTHORIZED } from "../config/statusCodes.js"
import Order from "../model/orderModel.js"
import Products from "../model/productModel.js"
import Reviews from "../model/reviewsModel.js"

const addReview = async (req,res) => {
    try {
        const {userId, productId, name, star, comment} = req.body
        // console.log(req.body)

        if(!userId){
            return res.status(UNAUTHORIZED).json({error : "Please Login to add a review"})
        }
        
        const order = await Order.findOne({ userId, productId });
        if (!order) {
            return res.status(UNAUTHORIZED).json({ error: "Please purchase this product to add a review" });
        }

        await Products.findByIdAndUpdate(productId,{$inc : {reviewCount : 1}}, {new : true});

        const newReview = new Reviews({ userId, productId, name, star, comment });

        await newReview.save()
        return res.status(CREATED).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        console.log(error)
        return res.status(INTERNAL_SERVER_ERROR).json({error: error.message})
    }
}

export default {addReview}