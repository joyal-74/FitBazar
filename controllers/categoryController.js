import Category from "../model/categoryModel.js";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categoryInfo = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({}).sort({createdAt : -1}).skip(skip).limit(limit)

        const totalcategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalcategories/ limit);

        res.render("admin/categories", {title : 'categories', errorMessage: "" , cat : categoryData, currentPage : page, 
            totalPages : totalPages, totalcategories : totalcategories})

    } catch (error) {
        console.error(error)
    }
}


const addCategory = async (req, res) => {
    try {
        let { addCategoryName, addCategoryDescription, addDiscountPrice, addVisibilityStatus } = req.body;

        // Trim input values to prevent accidental spaces
        addCategoryName = addCategoryName?.trim();
        addCategoryDescription = addCategoryDescription?.trim();

        // Validate required fields
        if (!addCategoryName || !addCategoryDescription) {
            return res.status(400).json({ error: "Category Name and Description are required." });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ name: addCategoryName });
        if (existingCategory) {
            return res.status(409).json({ error: "Category already exists." }); // 409 Conflict
        }

        // Convert visibility status to boolean
        addVisibilityStatus = addVisibilityStatus === "Active";
        const thumbnail = req.file ? req.file.filename : null;

        // Create new category
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

        return res.status(201).json({ message: "Category added successfully." }); // 201 Created

    } catch (error) {
        console.error("Add Category Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};




const editCategory = async (req, res) => {
    try {
        const { categoryName, editCategoryName, editCategoryDescription, discountPrice, editVisibilityStatus, removeThumbnail } = req.body;
        let thumbnail = req.file ? req.file.filename : null; // Start with new file if uploaded

        // Find the category to update
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }

        // Handle thumbnail removal or replacement
        if ((req.file || removeThumbnail === "true") && category.thumbnail) {
            const oldThumbnailPath = path.join(__dirname, "..", "public", "uploads", category.thumbnail);
            fs.unlink(oldThumbnailPath, (err) => {
                if (err) {
                    console.error("Failed to delete old thumbnail:", err);
                } else {
                    console.log("Old thumbnail deleted successfully:", oldThumbnailPath);
                }
            });
        }

        // Set thumbnail based on request
        if (removeThumbnail === "true") {
            thumbnail = null; // Remove thumbnail if requested
        } else if (!req.file) {
            thumbnail = category.thumbnail; // Keep existing thumbnail if no new file is uploaded
        }

        // Update category fields
        category.name = editCategoryName;
        category.description = editCategoryDescription;
        category.categoryOffer = discountPrice ? parseFloat(discountPrice) : 0;
        category.visibility = editVisibilityStatus === "Active";
        category.thumbnail = thumbnail;

        // Save the updated category
        await category.save();
        console.log("Uploaded file:", req.file);
        console.log("Request body:", req.body);

        return res.status(200).json({ message: "Category updated successfully!" });
    } catch (error) {
        console.error("Edit category error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};




export default {categoryInfo, addCategory, editCategory}