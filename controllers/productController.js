import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';
import User from '../model/userModel.js';
import Reviews from '../model/reviewsModel.js';
import { OK, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../config/statusCodes.js'
import cloudinary from '../config/cloudinary.js';

const loadaddProducts = async (req, res) => {
    try {
        const categories = await Category.find({ visibility: true });


        res.render("admin/newproducts", {
            title: "Add New Product",
            category: categories,
        });

    } catch (error) {
        console.error("Error loading add product page:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error. Please try again later." });
    }
};


const generateProductId = async () => {
    const count = await Products.countDocuments();
    return `FBZ${1000 + count + 1}`;
};



const addProducts = async (req, res) => {
    try {
        const { productName, productCategory, productBrand, productPrice, productOffer, shortDescription, productDescription, productSpec, colorVariant, weightVariant, stockVariant } = req.body;


            const variants = [];
            for (let i = 0; i < colorVariant.length; i++) {
                variants.push({
                    color: colorVariant[i],
                    weight: weightVariant[i],
                    stock: parseInt(stockVariant[i], 10),
                });
            }
        
        const imageUrls = req.files.map(file => file.path);

        let productId = await generateProductId();

        const category = await Category.findOne({ name: productCategory })
        const categoryId = category._id

        const newProduct = new Products({
            productId: productId,
            name: productName,
            shortDescription,
            description: productDescription,
            productSpec: productSpec,
            brand: productBrand,
            category: categoryId,
            images: imageUrls,
            price: productPrice,
            productOffer: productOffer,
            variants
        });

        await newProduct.save();

        await Category.findOneAndUpdate({ name: productCategory }, { $inc: { itemsCount: 1 } })

        return res.status(CREATED).json({ message: "Product added successfully." });

    } catch (error) {
        console.error("Add product Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
}

const editProducts = async (req, res) => {
    try {
        const { productId, productName, productCategory, productBrand, productPrice, productOffer, shortDescription, productDescription, productSpec, colorVariant, weightVariant, stockVariant } = req.body;

        // console.log(productId)
        // console.log(productCategory)

        const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];
        // console.log(removedImages);
        

        const product = await Products.findOne({productId});

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        for (const imageUrl of removedImages) {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);

            // Remove the image from the product document
            product.images = product.images.filter(img => img !== imageUrl);
        }

        const category = await Category.findOne({ _id : productCategory })
        const categoryId = category._id

        // Handle product update
        product.name = productName;
        product.shortDescription = shortDescription;
        product.description = productDescription;
        product.productSpec = productSpec;
        product.brand = productBrand;
        product.category = categoryId;

        // Update variants
        const variants = [];
        for (let i = 0; i < colorVariant.length; i++) {
            variants.push({
                color: colorVariant[i],
                weight: weightVariant[i],
                stock: parseInt(stockVariant[i], 10),
            });
        }
        product.variants = variants;

        // Handle new image uploads
        if (req.files) {
            const newImages = req.files.map(file => file.path);
            product.images.push(...newImages);
        }

        await product.save();

        return res.status(200).json({ message: "Product updated successfully." });
    } catch (error) {
        console.error("Edit Product Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};





const productInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const filter = {};

        const categories = await Category.find();

        if (req.query.category && req.query.category !== "all") {
            filter.category = req.query.category;
        }

        if (req.query.stock === "1") {
            filter.stock = { $gt: 0 };
        } else if (req.query.stock === "2") {
            filter.stock = { $eq: 0 };
        }

        if (req.query.status === "1") {
            filter.visibility = true;
        } else if (req.query.status === "2") {
            filter.visibility = false;
        }

        if (req.query.query) {
            const searchRegex = new RegExp(req.query.query, "i");
            filter.name = searchRegex;
        }

        const products = await Products.find(filter)
            .populate('category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalProducts = await Products.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("admin/products", {
            title: "Products",
            errorMessage: "",   
            product: products,
            cat: categories,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            selectedCategory: req.query.category || "all",
            selectedStock: req.query.stock || "all",
            selectedStatus: req.query.status || "all",
            searchQuery: req.query.query || "",
        });

    } catch (error) {
        console.error("Product info fetch error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};



const loadEditProducts = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Products.findOne({ productId });
        const category = await Category.find({ visibility: true });

        if (!product) {
            return res.status(NOT_FOUND).send("Product not found.");
        }

        res.render('admin/updateProducts', { title: "Edit Products", product, category });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

const loadproductDetails = async (req, res) => {
    const { productId, category } = req.query;

    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    const user = await User.findOne({ _id: userId });

    const reviews = await Reviews.find()

    const product = await Products.findOne({ productId }).populate('category')
    const relateproducts = await Products.find({ category }).limit(4);

    res.render('productdetails', { title: "productDetails", product, relateproducts, userId, user, reviews })
}

// shop pages and product details

const loadShop = async (req, res) => {
    try {

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({ _id: userId });

        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Extract filters from req.query
        let filter = { visibility: true };
        if (req.query.result) {
            filter.name = { $regex: req.query.result, $options: "i" };
        }
        if (req.query.category) {
            filter.category = req.query.category;
        }
        if (req.query.price) {
            filter.$expr = {
                $lte: [
                    { $subtract: ["$price", { $multiply: ["$price", { $divide: ["$productOffer", 100] }] }] },
                    parseInt(req.query.price)
                ]
            };
        }
        if (req.query.brand) {
            filter.brand = req.query.brand;
        }
        if (req.query.availability) {
            filter.stock = { $gt: 0 };
        }

        // Sorting
        const sortOption = req.query.sort || "newest";
        let sortQuery = {};
        if (sortOption === "priceLowToHigh") sortQuery = { salePrice: 1 };
        else if (sortOption === "priceHighToLow") sortQuery = { salePrice: -1 };
        else if (sortOption === "aToZ") sortQuery = { name: 1 };
        else if (sortOption === "zToA") sortQuery = { name: -1 };
        else if (sortOption === "ratingHighToLow") sortQuery = { rating: -1 };
        else sortQuery = { createdAt: -1 };

        // Fetch products
        const product = await Products.aggregate([
            { $match: filter },
            { $addFields: { salePrice: { $subtract: ["$price", { $multiply: ["$price", { $divide: ["$productOffer", 100] }] }] } } },
            { $sort: sortQuery },
            { $skip: skip },
            { $limit: limit }
        ]);

        const categories = await Category.find({ visibility: true });
        const brands = await Products.find().distinct("brand");
        const totalProducts = await Products.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("shop", {
            title: "Shop",
            product,
            brands,
            category: categories,
            appliedFilters: req.query,
            currentPage: page,
            totalPages,
            sortOption,
            user
        });

    } catch (error) {
        console.error("Error loading shop:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Error fetching products");
    }
};


export default { productInfo, loadaddProducts, addProducts, loadEditProducts, editProducts, loadShop, loadproductDetails }