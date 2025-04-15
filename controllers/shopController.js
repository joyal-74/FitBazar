import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';
import User from '../model/userModel.js';
import Reviews from '../model/reviewsModel.js';
import { INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'
import Wishlist from '../model/wishlistModel.js';


const loadproductDetails = async (req, res) => {
    try {
        const { productId, category } = req.query;
    
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({ _id: userId });

        const reviews = await Reviews.find({productId})

        const product = await Products.findOne({ _id : productId }).populate('category')
        const relateproducts = await Products.find({ category }).limit(4);

        return res.render('productdetails', { title: "productDetails", product, relateproducts, userId, user, reviews })
    } catch (error) {
        console.log(error)
    }
}


const loadShop = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({ _id: userId });

        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        let filter = { visibility: true };

        // Handle search result query
        if (req.query.result) {
            filter.name = { $regex: req.query.result, $options: "i" };
        }

        // Handle category filter
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

        // Handle brand filter
        if (req.query.brand) {
            let brands = Array.isArray(req.query.brand)
                ? req.query.brand
                : req.query.brand.includes(',')
                    ? req.query.brand.split(',')
                    : [req.query.brand];
            filter.brand = { $in: brands };
        }

        // Handle price range filter (before offer)
        if (req.query.minPrice && req.query.maxPrice) {
            const minPrice = parseInt(req.query.minPrice);
            const maxPrice = parseInt(req.query.maxPrice);

            filter.price = { $gte: minPrice, $lte: maxPrice };
        }

        // Handle availability filter
        if (req.query.availability) {
            filter.stock = { $gt: 0 };
        }

        // Handle sorting options
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

        // Fetch filtered and sorted products from database (without applying offers yet)
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

        // Apply offers/discounts dynamically on the server side
        const filteredProducts = products.filter(product => {
            // Calculate the offer display
            const displayOffer = Math.max(product.productOffer || 0, product.category?.offer || 0);

            // Calculate the final price after applying offer
            const finalPrice = Math.round(product.price - (product.price * displayOffer / 100));

            // Filter based on the final price after applying the offer
            const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : 0;
            const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : Number.MAX_SAFE_INTEGER;
            return finalPrice >= minPrice && finalPrice <= maxPrice;
        });

        // Fetch wishlist items and user data
        const wishlistItems = await Wishlist.find({ userId }).select('product');
        const wishlistProductIds = wishlistItems.map(item => item.product.toString());
        
        // Fetch categories and brands for filters
        const categories = await Category.find({ visibility: true });
        const brands = await Products.distinct("brand", { visibility: true });

        // Calculate total products and pages for pagination
        const totalProducts = filteredProducts.length;
        const totalPages = Math.ceil(totalProducts / limit);

        // Render the shop page with products and filters
        res.render("shop", {
            title: "Shop",
            product: filteredProducts,
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