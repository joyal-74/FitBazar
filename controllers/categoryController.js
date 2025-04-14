import Category from "../model/categoryModel.js";
import { OK,  NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR, CONFLICT } from '../config/statusCodes.js'


const categoryInfo = async (req, res) => {
    try {
        const searchQuery = req.query.q || "";
        
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({ name: { $regex: searchQuery, $options: "i" }}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalcategories = await Category.countDocuments({ name: { $regex: searchQuery, $options: "i" }});

        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {title: "categories", errorMessage: "", cat: categoryData, currentPage: page,
            totalPages: totalPages, totalcategories: totalcategories, selectedFilter: "", searchQuery: searchQuery
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};


const addCategory = async (req, res) => {
    try {
        const { addName, addDescription } = req.body;
        let addStatus = req.body.addStatus === "Active" ? true : false;

        if (!addName || !addDescription) {
            return res.status(BAD_REQUEST).json({ error: "Category Name and Description are required." });
        }

        const existingCategory = await Category.findOne({ name: addName });
        if (existingCategory) {
            return res.status(CONFLICT).json({ error: "Category already exists." });
        }

        const thumbnail = req.file ? req.file.path : null;

        const newCategory = new Category({
            name: addName,
            description: addDescription,
            thumbnail: thumbnail,
            visibility: addStatus,
        });

        await newCategory.save();

        return res.status(OK).json({ message: "Category added successfully." });

    } catch (error) {
        console.error("Add Category Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};


const editCategory = async (req, res) => {
    try {
        const { orgName, editName, editDescription, editStatus } = req.body;
        
        let thumbnail = req.file ? req.file.path : null;

        const category = await Category.findOne({ name: orgName });
        if (!category) {
            return res.status(NOT_FOUND).json({ error: "Category not found." });
        }

        const existingCategory = await Category.findOne({ name: editName });
        if (existingCategory && existingCategory._id.toString() !== category._id.toString()) {
            return res.status(BAD_REQUEST).json({ nameError: "Category name already exists." });
        }
        
        thumbnail = req.file ? req.file.path : category.thumbnail;

        category.name = editName;
        category.description = editDescription;
        category.visibility = editStatus?.toLowerCase() === "active";
        category.thumbnail = thumbnail;

        await category.save();

        return res.status(OK).json({ message: "Category updated successfully!" });
    } catch (error) {
        console.error("Edit category error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};



const filterCategories = async (req, res) => {
    try {
        const { visibility } = req.query;
        let filter = {};

        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        if (visibility === 'true') {
            filter.visibility = true;
        } else if (visibility === 'false') {
            filter.visibility = false;
        }

        const categories = await Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalcategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalcategories / limit);

        res.render("admin/categories", {
            title: "Categories", 
            errorMessage: "", 
            cat: categories,
            currentPage: page, 
            totalPages: totalPages,
            totalcategories: totalcategories,
            selectedFilter: visibility || undefined, searchQuery: ""
        });

    } catch (error) {
        console.error("Filter error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};


export default {categoryInfo, addCategory, editCategory, filterCategories}