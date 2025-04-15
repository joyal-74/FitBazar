import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Cart from "../model/cartModel.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED } from "../config/statusCodes.js";
import Wishlist from "../model/wishlistModel.js";

const addItemToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, basePrice, price, variants } = req.body;

        if (!userId) {
            return res.status(UNAUTHORIZED).json({ error: 'Please log in to add items to your cart.' });
        }

        if (!productId || !quantity || !price || quantity <= 0 || price <= 0) {
            return res.status(NOT_FOUND).json({ error: 'Invalid input values.' });
        }

        const product = await Products.findOne({ _id: productId, visibility: true });
        if (!product) {
            return res.status(NOT_FOUND).json({ error: 'Product not found.' });
        }

        let availableStock = product.stock;
        const userCart = await Cart.findOne({ userId });
        let existingQuantity = 0;

        if (userCart) {
            const matchingItem = userCart.items.find(item =>
                item.productId.toString() === product._id.toString() &&
                item.variants?.color === variants?.color &&
                item.variants?.weight === variants?.weight
            );
        
            if (matchingItem) {
                existingQuantity = matchingItem.quantity;
            }
        }
        

        if (variants?.color || variants?.weight) {
            const variant = product.variants.find(
                v => v.color === variants.color && v.weight === variants.weight
            );
            if (!variant) {
                return res.status(NOT_FOUND).json({ error: 'Selected variant not available.' });
            }
            availableStock = variant.stock;
        }

        console.log(existingQuantity + Number(quantity))
        console.log(availableStock);

        if (existingQuantity + Number(quantity) > availableStock) {
            return res.status(BAD_REQUEST).json({
                error: `Only ${availableStock - existingQuantity} more units of "${product.name}" available in stock for this variant.`
            });
        }

        if (quantity > availableStock) {
            return res.status(BAD_REQUEST).json({
                error: `Only ${availableStock} units of "${product.name}" available in stock for this variant.`
            });
        }

        const item = {
            name: product.name,
            brand: product.brand,
            productId: product._id,
            quantity: parseInt(quantity),
            price,
            basePrice,
            variants,
            productImage: product.images[0]
        };

        const cart = await Cart.findOneAndUpdate(
            { userId, 'items.productId': product._id, 'items.variants.color': variants?.color, 'items.variants.weight': variants?.weight },
            {
                $inc: { 'items.$.quantity': quantity },
                $set: { 'items.$.price': price }
            },
            { new: true }
        );

        if (!cart) {
            await Cart.findOneAndUpdate(
                { userId },
                { $push: { items: item } },
                { upsert: true, new: true }
            );
        }

        await Promise.all([
            Wishlist.findOneAndDelete({ product: productId }),
            User.findByIdAndUpdate(userId, { $set: { cart: cart?._id } })
        ]);

        return res.status(OK).json({ message: 'Item added to cart successfully!' });
    } catch (error) {
        console.error('Add to cart error:', error.message);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal server error.' });
    }
};


const loadCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/login');
        }

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({ _id : userId});

        const cart = await Cart.findOne({ userId : userId }).populate('items.productId');

        if(!cart){
            res.render('user/cart', { title: 'cart', cart : null, user });
        }

        res.render('user/cart', { title: 'cart', cart, user });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}

const updateQuantity = async (req, res) => {
    const { productId, color, weight, change } = req.body;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    try {
        const cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            return res.status(NOT_FOUND).json({ message: "Cart not found" });
        }

        const item = cart.items.find(item =>
            item.productId.toString() === productId &&
            item.variants.color === color &&
            item.variants.weight === weight
        );

        if (!item) {
            return res.status(NOT_FOUND).json({ message: "Product not found in cart" });
        }

        const product = await Products.findOne({
            _id: productId,
            variants: {
                $elemMatch: {
                    color,
                    weight
                }
            }
        });

        if (!product) {
            return res.status(NOT_FOUND).json({ message: "Product not found" });
        }

        const variant = product.variants.find(v =>
            v.color === color && v.weight === weight
        );

        if(item.quantity > 10){
            return res.status(BAD_REQUEST).json({ error: "Maximum 10 product can purchase in a single order" });
        }

        if (change > 0) {
            if (item.quantity < variant.stock) {
                item.quantity += 1;
            } else {
                return res.status(BAD_REQUEST).json({ error: "Product stock limit reached" });
            }
        } else if (change < 0 && item.quantity > 1) {
            item.quantity -= 1;
        } else if (change < 0 && item.quantity === 1) {
            return res.status(BAD_REQUEST).json({ message: "Quantity unchanged as it’s already at minimum", cart });
        }

        await cart.save();

        return res.status(OK).json({ message: "Quantity updated successfully", cart });
    } catch (error) {
        console.error("Error updating quantity:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
};


const deleteFromcart = async (req,res)=> {
    try {
        const { productId } = req.body;
        const userId = req.query.userId;
    
        const cart = await Cart.findOneAndUpdate(
            { userId: userId },
            { $pull: { items: { productId: productId } } },
            { new: true }
        );

        if (!cart) {
            return res.status(NOT_FOUND).json({ message: "Cart not found" });
        }
        
        res.status(OK).json({mesage : "Item deleted from cart successfully"});
    } catch (error) {
        console.log(error);
        res.status(INTERNAL_SERVER_ERROR).json({message : 'Internal server error'});
    }
}

export default {loadCart, updateQuantity, addItemToCart, deleteFromcart};