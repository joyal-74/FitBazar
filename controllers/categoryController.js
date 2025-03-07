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
        let { addCategoryName, addCategoryDescription, addDiscountPrice, addVisibilityStatus, addWeights, addSizes } = req.body;

        addCategoryName = addCategoryName?.trim();
        addCategoryDescription = addCategoryDescription?.trim();

        const sizes = addSizes ? addSizes.split(',').map(size => size.trim()) : [];
        const weights = addWeights ? addWeights.split(',').map(weight => weight.trim()) : [];


        if (!addCategoryName || !addCategoryDescription) {
            return res.status(400).json({ error: "Category Name and Description are required." });
        }

        const existingCategory = await Category.findOne({ name: addCategoryName });
        if (existingCategory) {
            return res.status(409).json({ error: "Category already exists." });
        }

        if (addCategoryName === existingCategory.name) {
            return res.status(409).json({ error: "Category already exists." });
        }

        addVisibilityStatus = addVisibilityStatus === "Active";
        const thumbnail = req.file ? req.file.path : null;

        const newCategory = new Category({
            name: addCategoryName,
            description: addCategoryDescription,
            thumbnail: thumbnail,
            categoryOffer: addDiscountPrice || 0,
            visibility: addVisibilityStatus,
            attributes: { sizes, weights }
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
        let thumbnail = req.file ? req.file.path : null;

        editCategoryDescription = editCategoryDescription?.trim();
        // Find existing category by current name
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }

        const existingCategory = await Category.findOne({ name: editCategoryName });
        if (existingCategory && existingCategory._id.toString() !== category._id.toString()) {
            return res.status(400).json({ nameError: "Category name already exists." });
        }
        if(!editCategoryDescription){
            console.log("Category should need a description")
            return res.status(400).json({ descriptionError: "Category should need a description" });
        }

        // Retain existing thumbnail if no new file is uploaded
        thumbnail = req.file ? req.file.path : category.thumbnail;

        // Update category fields
        category.name = editCategoryName;
        category.description = editCategoryDescription;
        category.categoryOffer = discountPrice ? parseFloat(discountPrice) || 0 : 0;
        category.visibility = editVisibilityStatus?.toLowerCase() === "active";
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