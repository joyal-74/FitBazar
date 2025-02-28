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

const generateProductId = async () => {
    const count = await Products.countDocuments();
    return `FBZ${1000 + count + 1}`;
};

const addProducts = async (req, res) => {
    try {
        let { productName, productDescription, productSpec, productStock, productCategory, productBrand, productSize, productWeight, productColor, productPrice, discountPrice } = req.body;

        productName = productName?.trim();
        productDescription = productDescription?.trim();
        let productId = await generateProductId();

        if (!productName || !productDescription) {
            return res.status(400).json({ error: "Product Name and Description are required." });
        }

        let productImages = [];
        if (req.files) {
            productImages = req.files.map(file => file.filename);
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
            color : productColor,
            price : productPrice,
            discount : discountPrice
        });

        await newProduct.save();

        return res.status(201).json({ message: "Product added successfully." });

    } catch (error) {
        console.error("Add product Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
}

const editProducts = async (req, res) => {
    try {
        let { productId, productName, productDescription, productSpec, productStock, productCategory, productBrand, productSize, productWeight, productColor, productPrice, discountPrice, visibility } = req.body;

        productName = productName?.trim();
        productDescription = productDescription?.trim();

        const product = await Products.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        let productImages = product.productImages; // Keep existing images if no new ones are uploaded

        if (req.files && req.files.length > 0) {
            // Delete old images before storing new ones
            await Promise.all(
                product.productImages.map(async (image) => {
                    const oldImagePath = path.join(__dirname, "..", "public", "uploads", "products", image);
                    try {
                        await fs.promises.unlink(oldImagePath);
                        console.log("Deleted:", oldImagePath);
                    } catch (err) {
                        console.error("Error deleting file:", oldImagePath, err);
                    }
                })
            );

            // Store new image filenames
            productImages = req.files.map(file => file.filename);
            console.log("New uploaded images:", productImages);
        }

        // Update product details
        product.name = productName;
        product.description = productDescription;
        product.specifications = productSpec;
        product.brand = productBrand;
        product.category = productCategory;
        product.stock = parseInt(productStock) || 0;
        product.size = productSize;
        product.color = productColor;
        product.price = parseFloat(productPrice) || 0;
        product.weight = parseFloat(productWeight) || 0;
        product.discount = discountPrice ? parseFloat(discountPrice) : 0;
        product.visibility = visibility === "true";
        product.productImages = productImages;

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



export default {productInfo, loadaddProducts, addProducts, loadEditProducts , editProducts}