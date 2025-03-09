import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';
import { OK, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../config/statusCodes.js'

const loadaddProducts = async (req, res) => {
    try {
        const categories = await Category.find({ visibility: true });

        // Define size and weight options for each category
        const categoryAttributes = {};
        categories.forEach(category => {
            categoryAttributes[category.name] = {
                sizes: category.attributes.sizes || [],
                weights: category.attributes.weights || []
            };
        });

        res.render("admin/addProducts", { 
            title: "Add New Product", 
            category : categories, 
            categoryAttributes 
        });

    } catch (error) {
        console.error("Error loading add product page:", error.message);
        res.status(INTERNAL_SERVER_ERROR).render("NOT_FOUND", { 
            title: "Error", 
            message: "Internal Server Error. Please try again later." 
        });
    }
};


const generateProductId = async () => {
    const count = await Products.countDocuments();
    return `FBZ${1000 + count + 1}`;
};

const addProducts = async (req, res) => {
    try {
        let { productName, productDescription, productSpec, productStock, productCategory, productBrand, productSize, productWeight, productColor, productPrice, productOffer } = req.body;

        const colors = productColor ? productColor.split(',').map(color => color.trim()) : [];

        productName = productName?.trim();
        productDescription = productDescription?.trim();
        let productId = await generateProductId();

        if (!productName || !productDescription) {
            return res.status(BAD_REQUEST).json({ error: "Product Name and Description are required." });
        }

        let productImages = [];
        if (req.files) {
            productImages = req.files.map(file => file.path);
        }

        const newProduct = new Products({
            productId : productId,
            name: productName,
            description: productDescription,
            specifications : productSpec,
            brand : productBrand,
            category : productCategory,
            productImages: productImages,
            stock : productStock,
            size : productSize,
            weight : productWeight,
            color : colors,
            price : productPrice,
            productOffer : productOffer
        });

        await newProduct.save();

        await Category.findOneAndUpdate({name : productCategory},{$inc : {itemsCount : 1}})

        return res.status(CREATED).json({ message: "Product added successfully." });

    } catch (error) {
        console.error("Add product Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
}

const editProducts = async (req, res) => {
    try {
        let { productId, productName, productDescription, productSpec, productStock, productCategory, productBrand, productSize, productWeight, productColor, productPrice, productOffer, visibility } = req.body;

        const colors = productColor ? productColor.split(',').map(color => color.trim()) : [];
        productName = productName?.trim();
        productDescription = productDescription?.trim();

        // Find product by ID
        const product = await Products.findOne({ productId: productId });
        if (!product) {
            return res.status(NOT_FOUND).json({ error: "Product not found." });
        }

        let productImages = product.productImages;
        if (req.files && req.files.length > 0) {
            productImages = req.files.map(file => file.path);           
        }

        // Update product fields
        product.name = productName;
        product.description = productDescription;
        product.specifications = productSpec;
        product.brand = productBrand;
        product.category = productCategory;
        product.stock = parseInt(productStock) || 0;
        product.size = productSize;
        product.color = colors;
        product.price = parseFloat(productPrice) || 0;
        product.weight = parseFloat(productWeight) || 0;
        product.productOffer = productOffer;
        product.visibility = visibility === "true";
        product.productImages = productImages;

        // Save updated product
        await product.save();

        return res.status(OK).json({ 
            message: "Product updated successfully!", 
            updatedProduct: product 
        });

    } catch (error) {
        console.error("Edit product error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
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

        res.render('admin/editProducts', { title: "Edit Products", product, cat: category });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

const loadproductDetails = async (req,res) => {
    const { productId, category } = req.query;

    const product = await Products.findOne({productId})
    const relateproducts = await Products.find({category}).limit(4);

    res.render('productdetails', {title : "productDetails", product, relateproducts})
}

// shop pages and product details

const loadShop = async (req, res) => {
    try {
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
            sortOption
        });

    } catch (error) {
        console.error("Error loading shop:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Error fetching products");
    }
};


export default {productInfo, loadaddProducts, addProducts, loadEditProducts , editProducts, loadShop, loadproductDetails}