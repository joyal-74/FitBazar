import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import productController from "../controllers/productController.js";


//session handled home route
router.get('/', userController.getUserHome);

//shop page
router.get('/shop', productController.loadShop)
router.get('/product', productController.loadproductDetails)

export default router