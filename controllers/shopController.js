import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';
import User from '../model/userModel.js';
import Reviews from '../model/reviewsModel.js';
import { INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'
import Wishlist from '../model/wishlistModel.js';


const loadproductDetails = async (req, res) => {
    const { productId, category } = req.query;
    
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    const user = await User.findOne({ _id: userId });

    const reviews = await Reviews.find({productId})

    const product = await Products.findOne({ _id : productId }).populate('category')
    const relateproducts = await Products.find({ category }).limit(4);

    res.render('productdetails', { title: "productDetails", product, relateproducts, userId, user, reviews })
}


const loadShop = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({ _id: userId });

        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        let filter = { visibility: true };

        if (req.query.result) {
            filter.name = { $regex: req.query.result, $options: "i" };
        }

        if (req.query.category) {
            let categories = Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category];
            const matchedCategories = await Category.find({ 
                name: { $in: categories },
                visibility: true 
            }).select('_id');
            if (matchedCategories.length) {
                filter.category = { $in: matchedCategories.map(cat => cat._id) };
            }
        }

        if (req.query.brand) {
            let brands = Array.isArray(req.query.brand)
                ? req.query.brand
                : req.query.brand.includes(',')
                    ? req.query.brand.split(',')
                    : [req.query.brand];
            filter.brand = { $in: brands };
        }
        

        if (req.query.price) {
            filter.price = { $lte: parseInt(req.query.price) };
        }
        


        if (req.query.availability) {
            filter.stock = { $gt: 0 };
        }

        const sortOption = req.query.sort || "newest";
        let sortQuery = {};
        switch (sortOption) {
            case "priceLowToHigh":
                sortQuery = { price: 1 };
                break;
            case "priceHighToLow":
                sortQuery = { price: -1 };
                break;
            case "aToZ":
                sortQuery = { name: 1 };
                break;
            case "zToA":
                sortQuery = { name: -1 };
                break;
            case "ratingHighToLow":
                sortQuery = { rating: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        const products = await Products.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id', 
                    as: 'category'
                }
            },
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true 
                }
            },
            { $sort: sortQuery },
            { $skip: skip },
            { $limit: limit }
        ]);

        const wishlistItems = await Wishlist.find({ userId }).select('product');
        const wishlistProductIds = wishlistItems.map(item => item.product.toString());
        
        const categories = await Category.find({ visibility: true });
        const brands = await Products.distinct("brand", { visibility: true });
        const totalProducts = await Products.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("shop", {
            title: "Shop",
            product: products,
            brands,
            category: categories,
            appliedFilters: req.query,
            currentPage: page,
            totalPages,
            sortOption,
            user,
            wishlistProductIds
        });

    } catch (error) {
        console.error("Error loading shop:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Error fetching products");
    }
};


export default {loadShop, loadproductDetails};