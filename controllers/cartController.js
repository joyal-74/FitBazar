
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Cart from "../model/cartModel.js";


const addItemToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price, variants } = req.body;

        console.log(req.body);

        const product = await Products.findOne({ productId: productId, visibility : true });
        console.log(product);

        if (!product) {
            return res.status(404).json({ error: "Product not found unable to add to cart" });
        }

        const name = product.name;
        const brand = product.brand;
        const productImage = product.variants[0].images[0]
        console.log(productImage)

        let cart = await Cart.findOne({ userId: userId });

        if (cart) {
            const existingItemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === product._id.toString()
            );

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].name = name;
                cart.items[existingItemIndex].brand = brand;
                cart.items[existingItemIndex].quantity = quantity;
                cart.items[existingItemIndex].price = price;
                cart.items[existingItemIndex].stock = product.stock;
                cart.items[existingItemIndex].variants = variants;
                cart.items[existingItemIndex].productImage = productImage;
            } else {
                cart.items.push({
                    name,
                    brand,
                    productId: product._id,
                    quantity,
                    price,
                    stock: product.stock,
                    variants,
                    productImage
                });
            }

            await cart.save();
        } else {
            const newCart = new Cart({
                userId,
                items: [{
                    name,
                    brand,
                    productId: product._id,
                    quantity,
                    price,
                    stock: product.stock,
                    variants,
                    productImage
                }]
            });

            await newCart.save();

        }
        await User.findByIdAndUpdate(userId, {
            $set: { cart: cart._id }
        });
        
        return res.status(200).json({ message: "Item added to cart successfully!" });
    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(500).json({ error: "Internal server error." });
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const updateQuantity = async (req, res) => {
    const { productId, change } = req.body;
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    // Find the cart and ensure the item exists within it
    const cart = await Cart.findOne({ userId: userId, 'items.productId': productId });

    if (!cart) {
        return res.status(404).json({ message: "Cart or product not found" });
    }

    // Find the specific item
    const item = cart.items.find(item => item.productId.toString() === productId);

    if (!item) {
        return res.status(404).json({ message: "Product not found in cart" });
    }

    // Update quantity
    if (change > 0) {
        item.quantity += 1;
    } else if (change < 0 && item.quantity > 1) {
        item.quantity -= 1;
    } else if (change < 0 && item.quantity === 1) {
        return res.status(400).json({ message: "Cannot reduce quantity below 1" });
    }

    await cart.save();

    return res.status(200).json({ message: "Quantity updated successfully", cart });
};




const loadCheckout = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/checkout', {title : "Checkout", user});
}

const loadPayments = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/payment', {title : "Checkout", user});
}

const confirmOrder = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/confirmOrder', {title : "Checkout", user});
}

export default {loadCart, updateQuantity, addItemToCart, loadCheckout, loadPayments, confirmOrder};