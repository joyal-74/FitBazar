import Category from "../model/categoryModel.js";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const limit = process.env.PAGINATION_LIMIT || 8;

const categoryInfo = async (req, res, next) => {
    try {
        const { q: searchQuery = "", status, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const filter = { name: { $regex: searchQuery, $options: "i" } };
        const [categoryData, totalcategories] = await Promise.all([
            Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Category.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {
            title: "categories",
            errorMessage: "",
            cat: categoryData,
            currentPage: page,
            totalPages,
            totalcategories,
            selectedFilter: "",
            searchQuery
        });
    } catch (error) {
        next(error);
    }
};

const addCategory = async (req, res, next) => {
    try {
        let { addCategoryName, addCategoryDescription, addDiscountPrice, addVisibilityStatus } = req.body;
        addCategoryName = addCategoryName?.trim();
        addCategoryDescription = addCategoryDescription?.trim();

        if (!addCategoryName || !addCategoryDescription) {
            return res.status(400).json({ error: "Category Name and Description are required." });
        }

        const existingCategory = await Category.findOne({ name: addCategoryName });
        if (existingCategory) {
            return res.status(409).json({ error: "Category already exists." });
        }

        const thumbnail = req.file ? req.file.filename : null;
        const newCategory = new Category({
            name: addCategoryName,
            description: addCategoryDescription,
            thumbnail,
            categoryOffer: addDiscountPrice || 0,
            visibility: addVisibilityStatus === "Active"
        });

        await newCategory.save();
        res.status(201).json({ message: "Category added successfully." });
    } catch (error) {
        next(error);
    }
};

const editCategory = async (req, res, next) => {
    try {
        const { categoryName, editCategoryName, editCategoryDescription, discountPrice, editVisibilityStatus, removeThumbnail } = req.body;
        let thumbnail = req.file ? req.file.filename : null;

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }

        if (req.file && category.thumbnail) {
            const oldThumbnailPath = path.join(__dirname, "..", "public", "uploads", category.thumbnail);
            if (fs.existsSync(oldThumbnailPath)) {
                fs.unlink(oldThumbnailPath, (err) => {
                    if (err) console.error("Failed to delete old thumbnail:", err);
                });
            }
        }

        category.name = editCategoryName;
        category.description = editCategoryDescription;
        category.categoryOffer = discountPrice ? parseFloat(discountPrice) : 0;
        category.visibility = editVisibilityStatus === "Active";
        category.thumbnail = thumbnail || category.thumbnail;

        await category.save();
        res.status(200).json({ message: "Category updated successfully!" });
    } catch (error) {
        next(error);
    }
};

const filterCategories = async (req, res, next) => {
    try {
        const { visibility } = req.query;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const filter = visibility !== undefined ? { visibility: visibility === 'true' } : {};
        const [categories, totalcategories] = await Promise.all([
            Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Category.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {
            title: "Categories",
            errorMessage: "",
            cat: categories,
            currentPage: page,
            totalPages,
            totalcategories,
            selectedFilter: visibility,
            searchQuery: ""
        });
    } catch (error) {
        next(error);
    }
};

export default { categoryInfo, addCategory, editCategory, filterCategories };