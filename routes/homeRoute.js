import express from "express";
const router = express.Router();
import userController from '../controllers/userController.js';
import shopController from "../controllers/shopController.js";
import userAuth from "../middleware/userAuth.js";


//session handled home route
router.get('/', userAuth.verifyUserStatus ,userController.getUserHome);

//shop page
router.get('/shop', shopController.loadShop);
router.get('/product', shopController.loadproductDetails);

// about uS

router.get('/about', shopController.loadAbout);

export default router