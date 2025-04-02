import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import Order from '../model/orderModel.js';
import Products from '../model/productModel.js';
import Category from '../model/categoryModel.js';


const loadSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateFilter = {};

        const productSales = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Shipped', 'Delivered', 'Out for Delivery'] },
                    ...dateFilter
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo._id',
                    productName: { $first: '$productInfo.name' },
                    totalOrders: { $sum: 1 },
                    totalDiscounts: { $sum: '$discount' },
                    totalAmount: { $sum: '$totalPrice' }
                }
            },
            {
                $project: {
                    _id: 0,
                    productName: 1,
                    totalOrders: 1,
                    totalDiscounts: 1,
                    totalAmount: 1
                }
            },
            { $sort: { productName: 1 } }
        ]);

        const paymentMethods = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Shipped', 'Delivered', 'Out for Delivery'] },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    paymentMethod: '$_id',
                    totalOrders: 1
                }
            },
            { $sort: { paymentMethod: 1 } }
        ]);

        const categories = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Shipped', 'Delivered', 'Out for Delivery'] },
                    ...dateFilter
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.name' },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryName: 1,
                    totalOrders: 1
                }
            },
            { $sort: { categoryName: 1 } }
        ]);

        const categorySales = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Shipped', 'Delivered', 'Out for Delivery'] },
                    ...dateFilter
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: {
                        categoryId: '$categoryInfo._id',
                        productId: '$productInfo._id'
                    },
                    categoryName: { $first: '$categoryInfo.name' },
                    productName: { $first: '$productInfo.name' },
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: '$totalPrice' }
                }
            },
            {
                $group: {
                    _id: '$_id.categoryId',
                    categoryName: { $first: '$categoryName' },
                    totalOrders: { $sum: '$totalOrders' },
                    totalSales: { $sum: '$totalSales' },
                    products: { $push: { name: '$productName', orders: '$totalOrders' } }
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryName: 1,
                    totalOrders: 1,
                    totalSales: 1,
                    bestSellingProduct: {
                        $arrayElemAt: [
                            '$products.name',
                            { $indexOfArray: ['$products.orders', { $max: '$products.orders' }] }
                        ]
                    }
                }
            },
            { $sort: { categoryName: 1 } }
        ]);

        const statusOrder = ["Pending", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"];

        const orderStatusCount = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        const statusCountMap = Object.fromEntries(orderStatusCount.map(order => [order._id, order.totalOrders]));

        const finalOrderStatusCount = statusOrder.map(status => ({
            status: status,
            totalOrders: statusCountMap[status] || 0
        }));

        // Summary Data
        const summary = {
            totalOrders: productSales.reduce((sum, p) => sum + p.totalOrders, 0),
            totalDiscounts: productSales.reduce((sum, p) => sum + p.totalDiscounts, 0),
            totalAmount: productSales.reduce((sum, p) => sum + p.totalAmount, 0)
        };

        // Render the sales report page
        res.render('admin/sales', {
            title: 'Sales Report',
            products: productSales,
            paymentMethods,
            categories,
            orderStatusCount: finalOrderStatusCount,
            categorySales,
            summary
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.status(500).send('Server Error');
    }
};




export default { loadSalesReport };
