import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import shopController from "../controllers/shopController.js";


//session handled home route
router.get('/', userController.getUserHome);

//shop page
router.get('/shop', shopController.loadShop);
router.get('/product', shopController.loadproductDetails);

export default router