import Reviews from "../model/reviewsModel.js"

const addReview = async (req,res) => {
    try {
        const {userId, productId, name, star, comment} = req.body
        console.log(req.body)

        if(!userId){
            return res.status(401).json({error : "Please Login to add a review"})
        }

        const newReview = new Reviews({ userId, productId, name, star, comment });

        await newReview.save()
        return res.status(201).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error.message})
    }
}

export default {addReview}