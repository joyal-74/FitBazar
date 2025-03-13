
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Cart from "../model/cartModel.js";
import Address from "../model/addressModel.js";


const addItemToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price, variants } = req.body;

        console.log(req.body);

        if(!userId){
            return res.status(401).json({ error: "Please log in to add items to your cart." });
        }

        const product = await Products.findOne({ productId: productId, visibility: true });
        console.log(product);

        if (!product) {
            return res.status(404).json({ error: "Product not found. Unable to add to cart." });
        }

        const name = product.name;
        const brand = product.brand;
        const productImage = product.variants[0].images[0];
        console.log(productImage);

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
            cart = new Cart({
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

            await cart.save();

            await User.findByIdAndUpdate(userId, {
                $set: { cart: cart._id }
            });
        }

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

    const cart = await Cart.findOne({ userId: userId, 'items.productId': productId });

    if (!cart) {
        return res.status(404).json({ message: "Cart or product not found" });
    }

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
            return res.status(404).json({ message: "Cart not found" });
        }
        
        res.status(200).json({mesage : "Item deleted from cart successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message : 'Internal server error'});
    }
}


const loadCheckout = async (req, res) => {
    const userId = req.query.userId;
    console.log(userId)


    const user = await User.findOne({_id : userId});
    const address = await Address.find({userId});
    const cart = await Cart.findOne({ userId : userId }).populate('items.productId');

    // console.log(address)
    
    res.render('user/checkout', {title : "Checkout", user, address, cart});
}

const checkoutDetails = async (req,res) => {
    const {selectedAddress} = req.body
    console.log('selectedAddress', selectedAddress);

    req.session.deliveryAddress = selectedAddress;

    res.redirect('/user/payments')
}

// will implement later
const loadCheckoutUp = async (req, res) => {
    try {
        const { id, index } = req.query;

        
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id : userId})
        if (!user) {
            return res.status(401).json({ error: "Please Login to continue" });
        }

        const address = await Address.findOne({ userId: id });

        if (!address) {
            return res.status(404).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];
        // console.log(selectedAddress);

        if (!selectedAddress) {
            return res.status(404).json({ error: "Address details not found" });
        }

        res.render('user/checkout-Up', { 
            title: "Edit Address",
            address: selectedAddress,
            user,
            addressId: id,
            index,
        });
    } catch (error) {
        console.error("Error loading address:", error);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};

const loadPayments = async (req, res) => {
    const userId = req.session.user?.id ?? req.session.user?._id ?? null;

    const user = await User.findOne({userId});

    const cart = await Cart.findOne({ userId : userId }).populate('items.productId');

    res.render('user/payment', {title : "Checkout", user, cart});
}

const paymentSuccess = async (req,res) => {
    const { paymentMethod } = req.body;
    const addressId = req.session.deliveryAddress

    if(paymentMethod == 'cod'){
        const address = await Address.findOne({
            details: { $elemMatch: { _id: addressId } }
        });

        if (address) {
            console.log(address)
            return res.status(200).json({ message: 'Order placed successfully' });
        } else {
            return res.status(404).json({ error: 'Address not found' });
        }
    }else{
        return res.status(400).json({error : "Payment method not implemented"});
    }

}

const confirmOrder = async (req, res) => {
    const userId = req.session.userId || "ID1001";
    const user = await User.findOne({userId})
    res.render('user/confirmOrder', {title : "Checkout", user});
}

export default {loadCart, updateQuantity, addItemToCart, deleteFromcart, loadCheckout, checkoutDetails, loadCheckoutUp, loadPayments, paymentSuccess , confirmOrder};