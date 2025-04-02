
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Cart from "../model/cartModel.js";
import Address from "../model/addressModel.js";
import Order from "../model/orderModel.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED, CREATED } from "../config/statusCodes.js";
import Wishlist from "../model/wishlistModel.js";
import Coupon from "../model/couponModel.js";


const addItemToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, basePrice, price, variants } = req.body;

        console.log('Request body:', req.body);

        if (!userId) {
            return res.status(401).json({ error: 'Please log in to add items to your cart.' });
        }

        // Validate inputs
        if (!productId || !quantity || !price || quantity <= 0 || price <= 0) {
            return res.status(400).json({ error: 'Invalid input values.' });
        }

        // Find product and validate visibility
        const product = await Products.findOne({ _id: productId, visibility: true });
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        let availableStock = product.stock;

        // Check variant stock if applicable
        if (variants?.color || variants?.weight) {
            const variant = product.variants.find(
                v => v.color === variants.color && v.weight === variants.weight
            );
            if (!variant) {
                return res.status(400).json({ error: 'Selected variant not available.' });
            }
            availableStock = variant.stock;
        }

        // Validate quantity against stock
        if (quantity > availableStock) {
            return res.status(400).json({
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
            stock: availableStock,
            variants,
            productImage: product.images[0]
        };

        // Update or create cart using atomic updates
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

        // Remove from wishlist and update user cart reference in parallel
        await Promise.all([
            Wishlist.findOneAndDelete({ product: productId }),
            User.findByIdAndUpdate(userId, { $set: { cart: cart?._id } })
        ]);

        return res.status(200).json({ message: 'Item added to cart successfully!' });
    } catch (error) {
        console.error('Add to cart error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
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
            return res.status(404).json({ message: "Cart not found" });
        }

        const item = cart.items.find(item =>
            item.productId.toString() === productId &&
            item.variants.color === color &&
            item.variants.weight === weight
        );

        if (!item) {
            return res.status(404).json({ message: "Product not found in cart" });
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
            return res.status(404).json({ message: "Product not found" });
        }

        const variant = product.variants.find(v =>
            v.color === color && v.weight === weight
        );

        if (change > 0) {
            if (item.quantity < variant.stock) {
                item.quantity += 1;
            } else {
                return res.status(400).json({ error: "Product stock limit reached" });
            }
        } else if (change < 0 && item.quantity > 1) {
            item.quantity -= 1;
        } else if (change < 0 && item.quantity === 1) {
            return res.status(200).json({ message: "Quantity unchanged as it’s already at minimum", cart });
        }

        await cart.save();

        return res.status(200).json({ message: "Quantity updated successfully", cart });
    } catch (error) {
        console.error("Error updating quantity:", error);
        return res.status(500).json({ error: "Internal server error" });
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


const loadCheckout = async (req, res) => {
    const userId = req.query.userId;

    const user = await User.findOne({ _id: userId });
    const address = await Address.find({ userId });
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    let cartTotal = 0;
    let deliveryCharge = 0;
    let grandTotal = 0;

    if (cart && cart.items.length > 0) {
        cartTotal = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        deliveryCharge = cartTotal < 499 ? 39 : 0;
        grandTotal = cartTotal + deliveryCharge;
    }

    const currentDate = new Date();

    const coupons = await Coupon.find({
        status: 'Active',
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate },
        minPrice: { $lte: grandTotal }
    });

    // Render checkout with all calculated values
    res.render('user/checkout', { 
        title: "Checkout", 
        coupons, 
        user, 
        address, 
        cart,
        calculatedValues: {
            cartTotal,
            deliveryCharge,
            grandTotal
        }
    });
};


const checkoutDetails = async (req,res) => {
    const {selectedAddress} = req.body

    req.session.deliveryAddress = selectedAddress;

    res.redirect('/user/payments')
}

const loadAddShoppingAddress = async(req,res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({_id : userId})

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items',
            select: 'name price brand variants'
        }).sort({ createdAt: -1 });

        const orderItems = cart.items
    
        res.render('user/shoppingAddress', {title : "Address", user, orderItems});
    } catch (error) {
        console.log(error);
    }
}

const addShoppingAddress = async (req,res) =>{
    try {
        const {fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode} = req.body;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        if(!userId){
            return res.status(BAD_REQUEST).json("Please Login to continue")
        }

        if (!fullName || !phone || !addressLine1 || !city || !state || !country) {
            return res.status(BAD_REQUEST).json({ error: "All required fields must be filled." });
        }

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                details: []
            });
        }

        const newIndex = userAddress.details.length;

        userAddress.details.push({
            index: newIndex,
            userId,
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            pincode: zipCode,
            phone,
            altPhone: altNumber
        });

        await userAddress.save();

        return res.status(CREATED).json({ message: "Address added successfully" , redirectUrl: `/user/checkout?userId=${userId}` });

    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address creation error" });
    }
}


const loadshoppingAddress = async (req,res) => {
    try {
        const { id, index } = req.query;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id : userId})
        if (!user) {
            return res.status(UNAUTHORIZED).json({ error: "Please Login to continue" });
        }

        const address = await Address.findOne({ userId });

        if (!address) {
            return res.status(NOT_FOUND).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];
        console.log(selectedAddress);

        if (!selectedAddress) {
            return res.status(NOT_FOUND).json({ error: "Address details not found" });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items',
            select: 'name price brand variants'
        }).sort({ createdAt: -1 });

        const orderItems = cart.items

        res.render('user/checkout-Up', { title: "Add new Address",address: selectedAddress,user, addressId: id,orderItems,index });

    } catch (error) {
        console.error("Error loading address:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error", message: error.message });
    }
}

const editshoppingAddress = async (req,res) =>{

    try {
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, country, altNumber, addressType, zipCode, index } = req.body;

        console.log(req.body)

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        let userAddress = await Address.findOne({ userId });

        userAddress.details[index] = {
            addressType,
            name: fullName,
            addressLine1,
            addressLine2,
            city,
            landmark,
            state,
            country,
            pincode: zipCode,
            phone,
            altPhone: altNumber,
        };

        await userAddress.save();
        return res.status(OK).json({ message: "Address updated" , redirectUrl: `/user/checkout?userId=${userId}`});


    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: error.message || "Address editing error" });
    }
}



const loadCheckoutUp = async (req, res) => {
    try {
        const { id, index } = req.query;

        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        const user = await User.findOne({_id : userId})
        if (!user) {
            return res.status(UNAUTHORIZED).json({ error: "Please Login to continue" });
        }

        const address = await Address.findOne({ userId: id });

        if (!address) {
            return res.status(NOT_FOUND).json({ error: "Address not found" });
        }

        const selectedAddress = address.details[index];
        // console.log(selectedAddress);

        if (!selectedAddress) {
            return res.status(NOT_FOUND).json({ error: "Address details not found" });
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
        res.status(INTERNAL_SERVER_ERROR).json({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};



const confirmOrder = async (req, res) => {
    try {
        
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    
        if (!userId) {
            console.error('User ID is missing in session.');
            return res.status(400).render('error', { title : "error",message: 'Invalid session. Please log in again.' });
        }

        const user = await User.findById(userId);

        // Find the latest orderItemCount for the user
        const latestOrder = await Order.findOne({ userId })
            .sort({ createdAt: -1 })
            .select('orderItemCount');
        
        if (!latestOrder) {
            console.error('No order found for user.');
            return res.status(400).render('error', { title : "error", message: 'No recent order found.' });
        }

        const orderItemCount = latestOrder.orderItemCount;

        // Fetch all orders with the same orderItemCount
        const orders = await Order.find({ userId })
        .populate('product')
            .sort({ createdAt: -1 }).limit(orderItemCount);

        if (!orders.length) {
            console.error('No matching orders found.');
            return res.status(400).render('error', { title : "error", message: 'No matching orders found.' });
        }

        const addressId = orders[0].address;
        console.log(`Address ID: ${addressId}`);

        // Fetch the full address directly by _id
        const address = await Address.findOne(
            { 'details._id': addressId },
            { 'details.$': 1 }
        );

        if (!address) {
            console.error('Address not found.');
            return res.status(400).render('error', {title : "error", message: 'Shipping address not found.' });
        }

        const shippingAddress = address.details[0];

        return res.render('user/confirmOrder', { title : "Order Confirmation", user, shippingAddress, orders });
    } catch (error) {
        console.error(`Error confirming order: ${error}`);
        return res.status(500).render('error', { title : "error", message: 'Something went wrong. Please try again later.' });
    }
};


export default {loadCart, updateQuantity, addItemToCart, deleteFromcart, loadCheckout, addShoppingAddress,
    checkoutDetails, loadAddShoppingAddress, loadshoppingAddress, editshoppingAddress, loadCheckoutUp, confirmOrder};