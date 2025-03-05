import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';


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
        res.status(500).render("404", { 
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
            return res.status(400).json({ error: "Product Name and Description are required." });
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

        return res.status(201).json({ message: "Product added successfully." });

    } catch (error) {
        console.error("Add product Error:", error);
        return res.status(500).json({ error: "Internal server error." });
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
            return res.status(404).json({ error: "Product not found." });
        }

        // Retain existing images if no new ones are uploaded
        let productImages = product.productImages;
        if (req.files && req.files.length > 0) {
            productImages = req.files.map(file => file.path);  // Cloudinary stores file paths (URLs)
            // console.log("New uploaded images:", productImages);
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
        product.visibility = visibility === "true"; // Convert string to boolean
        product.productImages = productImages;

        // Save updated product
        await product.save();

        return res.status(200).json({ 
            message: "Product updated successfully!", 
            updatedProduct: product 
        });

    } catch (error) {
        console.error("Edit product error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};


const productInfo = async (req, res) => {
    try {
        const searchQuery = req.query.q || "";
        
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const category = await Category.find({visibility : true});

        const productData = await Products.find({ name: { $regex: searchQuery, $options: "i" }}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalProducts = await Products.countDocuments({ name: { $regex: searchQuery, $options: "i" }});

        const totalPages = Math.ceil(totalProducts / limit);

        res.render("admin/products", {title: "Product", errorMessage: "", cat : category, product: productData, currentPage: page,
            totalPages: totalPages, totalProducts: totalProducts, searchQuery: searchQuery
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};


const loadEditProducts = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Products.findOne({ productId });
        const category = await Category.find({ visibility: true });

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        res.render('admin/editProducts', { title: "Edit Products", product, cat: category });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send("Internal Server Error");
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
        const limit = 20;
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
            filter.stock = { $gt: 0 }; // Only in-stock products
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
        res.status(500).send("Error fetching products");
    }
};



export default {productInfo, loadaddProducts, addProducts, loadEditProducts , editProducts, loadShop, loadproductDetails}