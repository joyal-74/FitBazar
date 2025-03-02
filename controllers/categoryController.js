import Category from "../model/categoryModel.js";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categoryInfo = async (req, res) => {
    try {
        const searchQuery = req.query.q || "";
        
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({ name: { $regex: searchQuery, $options: "i" }}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalcategories = await Category.countDocuments({ name: { $regex: searchQuery, $options: "i" }});

        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {title: "categories", errorMessage: "", cat: categoryData, currentPage: page,
            totalPages: totalPages, totalcategories: totalcategories, selectedFilter: "", searchQuery: searchQuery
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};


const addCategory = async (req, res) => {
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

        addVisibilityStatus = addVisibilityStatus === "Active";
        const thumbnail = req.file ? req.file.filename : null;

        const newCategory = new Category({
            name: addCategoryName,
            description: addCategoryDescription,
            thumbnail: thumbnail,
            categoryOffer: addDiscountPrice || 0,
            visibility: addVisibilityStatus
        });

        await newCategory.save();
        console.log("Uploaded file:", req.file);
        console.log("Request body:", req.body);

        return res.status(201).json({ message: "Category added successfully." });

    } catch (error) {
        console.error("Add Category Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};


const editCategory = async (req, res) => {
    try {
        const { categoryName, editCategoryName, editCategoryDescription, discountPrice, editVisibilityStatus } = req.body;
        let thumbnail = req.file ? req.file.filename : null;

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }

        if ((req.file) && category.thumbnail) {
            const oldThumbnailPath = path.join(__dirname, "..", "public", "uploads", category.thumbnail);
            fs.unlink(oldThumbnailPath, (err) => {
                if (err) {
                    console.error("Failed to delete old thumbnail:", err);
                } else {
                    console.log("Old thumbnail deleted successfully:", oldThumbnailPath);
                }
            });
        }

        if (!req.file) {
            thumbnail = category.thumbnail;
        }

        category.name = editCategoryName;
        category.description = editCategoryDescription;
        category.categoryOffer = discountPrice ? parseFloat(discountPrice) : 0;
        category.visibility = editVisibilityStatus === "Active";
        category.thumbnail = thumbnail;


        await category.save();

        return res.status(200).json({ message: "Category updated successfully!" });
    } catch (error) {
        console.error("Edit category error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};


const filterCategories = async (req, res) => {
    try {
        const { visibility } = req.query;
        let filter = {};

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        if (visibility === 'true') {
            filter.visibility = true;
        } else if (visibility === 'false') {
            filter.visibility = false;
        }

        const categories = await Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalcategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {title: "Categories", errorMessage: "", cat: categories,
            currentPage: page, totalPages: totalPages,totalcategories: totalcategories,
            selectedFilter: visibility || undefined, searchQuery: ""
        });

    } catch (error) {
        console.error("Filter error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};


export default {categoryInfo, addCategory, editCategory, filterCategories}