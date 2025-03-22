
import User from "../model/userModel.js";
import Products from "../model/productModel.js";
import Cart from "../model/cartModel.js";
import Address from "../model/addressModel.js";
import mongoose from "mongoose";
import Order from "../model/orderModel.js";
import generateOrderId from "../helpers/uniqueIdHelper.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED, CREATED } from "../config/statusCodes.js";
import { ObjectId } from "mongodb";


const addItemToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price, variants } = req.body;

        // console.log('Request body:', req.body);

        if (!userId) {
            return res.status(UNAUTHORIZED).json({ error: 'Please log in to add items to your cart.' });
        }


        const product = await Products.findOne({ _id: productId, visibility: true });
        if (!product) {
            return res.status(NOT_FOUND).json({ error: 'Product not found. Unable to add to cart.' });
        }

        let availableStock = product.stock;
        if (variants && (variants.color || variants.weight)) {
            const variant = product.variants.find(
                v => v.color === variants.color && v.weight === variants.weight
            );
            if (!variant) {
                return res.status(BAD_REQUEST).json({ error: 'Selected variant not available.' });
            }
            availableStock = variant.stock;
        }

        // Validate quantity against available stock
        if (quantity > availableStock) {
            return res.status(BAD_REQUEST).json({
                error: `Only ${availableStock} units of "${product.name}" available in stock for this variant.`
            });
        }

        const name = product.name;
        const brand = product.brand;
        const productImage = product.images[0];


        let cart = await Cart.findOne({ userId });

        if (cart) {
            const existingItemIndex = cart.items.findIndex(
                item => item.productId.toString() === product._id.toString() &&
                        item.variants?.color === variants?.color &&
                        item.variants?.weight === variants?.weight
            );

            if (existingItemIndex > -1) {
                const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
                if (newQuantity > availableStock) {
                    return res.status(BAD_REQUEST).json({
                        error: `Cannot exceed ${availableStock} units of "${product.name}" in stock.`
                    });
                }
                cart.items[existingItemIndex].quantity = newQuantity;
                cart.items[existingItemIndex].price = price;
            } else {
                cart.items.push({
                    name,
                    brand,
                    productId: product._id,
                    quantity: parseInt(quantity),
                    price,
                    stock: availableStock,
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
                    quantity: parseInt(quantity),
                    price,
                    stock: availableStock,
                    variants,
                    productImage
                }]
            });
            await cart.save();

            await User.findByIdAndUpdate(userId, { $set: { cart: cart._id } });
        }

        return res.status(OK).json({ message: 'Item added to cart successfully!' });
    } catch (error) {
        console.error('Add to cart error:', error);
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

const loadPayments = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;

        const user = await User.findOne({_id : userId});

        const cart = await Cart.findOne({ userId : userId }).populate('items.productId');

        res.render('user/payment', {title : "Checkout", user, cart});
    } catch (error) {
        console.error('Error loading payment:', error);
        res.redirect('/NOT_FOUND');
    }
}

const paymentSuccess = async (req, res) => {
    try {
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
        if (!userId) {
            return res.status(UNAUTHORIZED).json({ error: "Unauthorized. Please log in." });
        }

        const { couponApplied, paymentMethod } = req.body;

        if (!paymentMethod) {
            return res.status(BAD_REQUEST).json({ error: "Payment method is required." });
        }

        const addressId = req.session.deliveryAddress;
        if (!addressId) {
            return res.status(BAD_REQUEST).json({ error: "Delivery address not found." });
        }

        const objectId = new mongoose.Types.ObjectId(addressId);
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const orderItemCount = cart.items.length

        if (!cart || cart.items.length === 0) {
            return res.status(BAD_REQUEST).json({ error: "Cart is empty." });
        }

        if (paymentMethod === 'cod') {
            const address = await Address.findOne(
                { 'details._id': objectId },
                { 'details.$': 1 }
            );

            const customer = address.details[0].name;
            console.log(customer)

            if (!address) {
                return res.status(NOT_FOUND).json({ error: 'Address not found.' });
            }

            for (const item of cart.items) {
                const product = await Products.findById(item.productId._id);
                
                if (product) {
                    console.log('Product Variants:', product.variants);
                    console.log('Item Variant ID:', item.variants);
                
                
                    const selectedVariant = await Products.findOneAndUpdate(
                        {
                            _id: product._id,
                            'variants.color': item.variants.color,
                            'variants.weight': item.variants.weight,
                            'variants.stock': { $gte: item.quantity }
                        },
                        { $inc: { 'variants.$.stock': -item.quantity } },
                        { new: true }
                    );
                    
                    if (!selectedVariant) {
                        return res.status(400).json({
                            error: `Insufficient stock for "${product.name}".`
                        });
                    }                   
                }
            }

            // Create the order
            for (const item of cart.items) {
                const orderId = generateOrderId();
            
                const order = new Order({
                    userId,
                    orderId,
                    product: item.productId._id,
                    name: item.productId.name, 
                    customer,
                    quantity: item.quantity, 
                    price: item.productId.price, 
                    variant: item.variants,
                    brand: item.productId.brand, 
                    productImage: item.productImage, 
                    totalPrice: item.quantity * item.productId.price,
                    paymentMethod,
                    address: addressId,
                    status: 'Pending',
                    statusHistory: [{ status: 'Pending', timestamp: new Date() }],
                    couponApplied,
                    orderItemCount
                });
            
                await order.save();
            }
            

            // Clear the cart after order creation
            await Cart.findByIdAndDelete(cart._id);

            return res.status(OK).json({ message: 'Order placed successfully.' });
        } else {
            return res.status(BAD_REQUEST).json({ error: "Payment method not implemented." });
        }
    } catch (error) {
        console.error("Order Creation Error:", error);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};



const confirmOrder = async (req, res) => {
    try {
        
        const userId = req.session.user?.id ?? req.session.user?._id ?? null;
    
        if (!userId) {
            console.error('User ID is missing in session.');
            return res.status(400).render('error', { message: 'Invalid session. Please log in again.' });
        }

        const user = await User.findById(userId);

        // Find the latest orderItemCount for the user
        const latestOrder = await Order.findOne({ userId })
            .sort({ createdAt: -1 })
            .select('orderItemCount');
        
        if (!latestOrder) {
            console.error('No order found for user.');
            return res.status(400).render('error', { message: 'No recent order found.' });
        }

        const orderItemCount = latestOrder.orderItemCount;

        // Fetch all orders with the same orderItemCount
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 }).limit(orderItemCount);

        if (!orders.length) {
            console.error('No matching orders found.');
            return res.status(400).render('error', { message: 'No matching orders found.' });
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
            return res.status(400).render('error', { message: 'Shipping address not found.' });
        }

        const shippingAddress = address.details[0];

        return res.render('user/confirmOrder', { title : "Order Confirmation", user, shippingAddress, orders });
    } catch (error) {
        console.error(`Error confirming order: ${error}`);
        return res.status(500).render('error', { message: 'Something went wrong. Please try again later.' });
    }
};


export default {loadCart, updateQuantity, addItemToCart, deleteFromcart, loadCheckout, addShoppingAddress,
    checkoutDetails, loadAddShoppingAddress, loadshoppingAddress, editshoppingAddress, loadCheckoutUp, loadPayments, paymentSuccess , confirmOrder};