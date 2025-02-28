import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';

const loadaddProducts = async (req, res) => {
    try {
        const category = await Category.find({visibility : true});
        res.render('admin/addProducts', {title : "Add new Products", cat : category})
    } catch (error) {
        console.error(error.message)
    }
}


const addProducts = async (req, res) => {
    try {
        let { productName, productDescription, productStock, productCategory, productBrand, productSize, productWeight, productColor, productPrice, discountPrice } = req.body;

        productName = productName?.trim();
        productDescription = productDescription?.trim();

        if (!productName || !productDescription) {
            return res.status(400).json({ error: "Product Name and Description are required." });
        }

        let productImages = [];
        if (req.files) {
            productImages = req.files.map(file => file.filename);
        }

        const newProduct = new Products({
            name: productName,
            description: productDescription,
            brand : productBrand,
            category : productCategory,
            productImages: productImages,
            stock : productStock,
            size : productSize,
            weight : productWeight,
            color : productColor,
            price : productPrice,
            discount : discountPrice
        });

        await newProduct.save();
        console.log("Uploaded file:", req.files);
        console.log("Request body:", req.body);

        return res.status(201).json({ message: "Product added successfully." });

    } catch (error) {
        console.error("Add product Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
}



const productInfo = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const productData = await Products.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalProducts = await Products.countDocuments({});

        const totalPages = Math.ceil(totalProducts / limit);

        res.render("admin/products", {title: "Product", errorMessage: "", product: productData, currentPage: page,
            totalPages: totalPages, totalProducts: totalProducts
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};




export default {productInfo, loadaddProducts, addProducts}