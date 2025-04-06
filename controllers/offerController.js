import Products from "../model/productModel.js";
import Category from "../model/categoryModel.js";
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'

const addProductOffer = async (req,res)=> {
    try {
        try {
            const { productId, discount } = req.body;
            const products = await Products.findOne({productId})

            if(!products){
                return res.status(NOT_FOUND).json({error : "product not found"})
            }
    
            products.productOffer = discount;
    
            await products.save()
            return res.status(OK).json({message : "Offer added successfully...!"})
        } catch (error) {
            console.log(error)
            return res.status(INTERNAL_SERVER_ERROR).json({error : error})
        }
    } catch (error) {
        
    }
}

const removeProductOffer = async (req,res)=> {
    try {
        const { productId } = req.body;
        const products = await Products.findOne({productId})

        products.productOffer = 0;

        await products.save()
        return res.status(OK).json({message : "Offer deleted successfully...!"})
    } catch (error) {
        console.log(error)
        return res.status(INTERNAL_SERVER_ERROR).json({error : error})
    }
}

const addCategoryOffer = async (req,res)=> {
    try {
        try {
            const { categoryId, discount } = req.body;
            const category = await Category.findOne({_id : categoryId})

            if(!category){
                return res.status(NOT_FOUND).json({error : "product not found"})
            }
    
            category.offer = discount;
    
            await category.save()
            return res.status(OK).json({message : "Offer added successfully...!"})
        } catch (error) {
            console.log(error)
            return res.status(INTERNAL_SERVER_ERROR).json({error : error})
        }
    } catch (error) {
        
    }
}

const removeCategorytOffer = async (req,res)=> {
    try {
        const { categoryId } = req.body;
        const category = await Category.findOne({_id : categoryId})

        category.offer = 0;

        await category.save()
        return res.status(OK).json({message : "Offer deleted successfully...!"})
    } catch (error) {
        console.log(error)
        return res.status(INTERNAL_SERVER_ERROR).json({error : error})
    }
}

export default {addProductOffer, removeProductOffer, addCategoryOffer, removeCategorytOffer}