import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, CREATED } from '../config/statusCodes.js'
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
        const { productId, productName, productCategory, productBrand, productPrice, productOffer, shortDescription, productDescription, productSpec, colorVariant, weightVariant, stockVariant, visibility } = req.body;

        const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];

        const product = await Products.findOne({productId});

        if (!product) {
            return res.status(NOT_FOUND).json({ error: "Product not found." });
        }

        for (const imageUrl of removedImages) {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);

            product.images = product.images.filter(img => img !== imageUrl);
        }

        const category = await Category.findOne({ _id : productCategory })
        const categoryId = category._id

        product.name = productName;
        product.shortDescription = shortDescription;
        product.description = productDescription;
        product.price = productPrice;
        product.productSpec = productSpec;
        product.brand = productBrand;
        product.category = categoryId;
        product.productOffer = productOffer;
        product.visibility = visibility;

        const variants = [];
        for (let i = 0; i < colorVariant.length; i++) {
            variants.push({
                color: colorVariant[i],
                weight: weightVariant[i],
                stock: parseInt(stockVariant[i], 10),
            });
        }
        product.variants = variants;

        if (req.files) {
            const newImages = req.files.map(file => file.path);
            product.images.push(...newImages);
        }

        await product.save();

        return res.status(OK).json({ message: "Product updated successfully." });
    } catch (error) {
        console.error("Edit Product Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};


const productInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;
        const filter = {};

        const categories = await Category.find();

        if (req.query.category) {
            const category = await Category.findOne({ name: req.query.category });
            if (category) {
                filter.category = category._id;
            } else {
                filter.category = null;
            }
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


export default { productInfo, loadaddProducts, addProducts, loadEditProducts, editProducts }