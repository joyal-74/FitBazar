import Order from "../model/orderModel.js";
import Wallet from "../model/walletModel.js";
import moment from 'moment';

const loadDashboard = async (req, res) => {
    const { filter = 'weekly' } = req.query;

    // Calculate date range based on filter
    let startDate, endDate = new Date();
    switch (filter) {
        case 'weekly':
            startDate = moment().subtract(7, 'days').startOf('day').toDate();
            break;
        case 'monthly':
            startDate = moment().subtract(1, 'month').startOf('day').toDate();
            break;
        case 'yearly':
            startDate = moment().subtract(1, 'year').startOf('day').toDate();
            break;
        default:
            startDate = moment().subtract(7, 'days').startOf('day').toDate();
    }

    // Common match stage for all aggregations
    const dateFilter = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    // 1. Wallet Transactions Summary (with filter)
    const transactions = await Wallet.find(dateFilter);

    const summary = {
        'Add Money to Wallet': 0,
        'Refund Product': 0,
        'Product Cancelled': 0,
        'Product Purchase': 0
    };

    transactions.forEach(tx => {
        if (tx.type === 'add_money') summary['Add Money to Wallet'] += tx.amount;
        else if (tx.type === 'refund') summary['Refund Product'] += tx.amount;
        else if (tx.type === 'cancel') summary['Product Cancelled'] += tx.amount;
        else if (tx.type === 'product_purchase') summary['Product Purchase'] += tx.amount;
    });

    // 2. Revenue Data (dynamic grouping based on filter)
    let revenueLabels = [];
    let revenueData = [];
    let groupBy;

    if (filter === 'weekly') {
        for (let i = 6; i >= 0; i--) {
            const day = moment().subtract(i, 'days');
            const dayStart = day.startOf('day').toDate();
            const dayEnd = day.endOf('day').toDate();
    
            const orders = await Order.find({
                createdAt: { $gte: dayStart, $lte: dayEnd },
            });
    
            revenueLabels.push(day.format('ddd'));
            const totalRevenue = orders.reduce((sum, order) => {
                const orderTotal = order.orderItems.reduce((orderSum, item) => {
                    if (item.currentStatus === 'Cancelled') return orderSum;
                    return orderSum + (item.discountPrice || 0) * (item.quantity || 1);
                }, 0);
                return sum + orderTotal;
            }, 0);
        
            revenueData.push(totalRevenue);
        }
    } else if (filter === 'monthly') {
        const startOfMonth = moment().startOf('month');
        const weeksInMonth = Math.ceil(moment().daysInMonth() / 7);
    
        for (let i = 0; i < weeksInMonth; i++) {
            const weekStart = startOfMonth.clone().add(i * 7, 'days');
            const weekEnd = weekStart.clone().add(6, 'days').endOf('day');
    
            const actualEnd = weekEnd.isAfter(moment().endOf('month')) ? moment().endOf('month').endOf('day') : weekEnd;
    
            const orders = await Order.find({
                createdAt: {
                    $gte: weekStart.toDate(),
                    $lte: actualEnd.toDate()
                },
            });
    
            const label = `Week ${i + 1}`;
            revenueLabels.push(label);
            const totalRevenue = orders.reduce((sum, order) => {
                const orderTotal = order.orderItems.reduce((orderSum, item) => {
                    if (item.currentStatus === 'Cancelled') return orderSum;
                    return orderSum + (item.discountPrice || 0) * (item.quantity || 1);
                }, 0);
                return sum + orderTotal;
            }, 0);
        
            revenueData.push(totalRevenue);
        }
    } else if (filter === 'yearly') {
        for (let i = 11; i >= 0; i--) {
            const month = moment().subtract(i, 'months');
            const startOfMonth = month.startOf('month').toDate();
            const endOfMonth = month.endOf('month').toDate();
    
            const orders = await Order.find({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            });
    
            revenueLabels.push(month.format('MMM'));
            const totalRevenue = orders.reduce((sum, order) => {
                const orderTotal = order.orderItems.reduce((orderSum, item) => {
                    if (item.currentStatus === 'Cancelled') return orderSum;
                    return orderSum + (item.discountPrice || 0) * (item.quantity || 1);
                }, 0);
                return sum + orderTotal;
            }, 0);
        
            revenueData.push(totalRevenue);
        }
    }
    

    // 3. Best Selling Products (with filter)
    const bestSellingProducts = await Order.aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$orderItems" },
        { $group: {
            _id: "$orderItems.product",
            totalSold: { $sum: "$orderItems.quantity" }
        }},
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        {
            $project: {
                _id: 0,
                productId: "$productInfo.productId", 
                totalSold: 1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);
    

    // 4. Top Categories (with filter)
    const topCategories = await Order.aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$orderItems" },
        {
            $lookup: {
                from: "products",
                localField: "orderItems.product",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        {
            $group: {
                _id: "$productInfo.category",
                totalSold: { $sum: "$orderItems.quantity" }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" },
        {
            $project: {
                _id: 0,
                categoryName: "$categoryInfo.name",
                totalSold: 1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);
    

    // 5. Best Selling Brands (with filter)
    const bestSellingBrands = await Order.aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$orderItems" },
        {
            $lookup: {
                from: 'products',
                localField: 'orderItems.product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: '$productInfo' },
        {
            $group: {
                _id: '$productInfo.brand',
                totalSold: { $sum: '$orderItems.quantity' }
            }
        },
        {
            $project: {
                _id: 0,
                brand: "$_id",
                totalSold: 1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);

    const brandData = {
        labels: bestSellingBrands.map(item => item.brand),
        series: bestSellingBrands.map(item => item.totalSold)
    };

    // 6. Sales by Location (with filter)
    const salesByLocation = await Order.aggregate([
        { $match: { ...dateFilter } },
        { $lookup: { from: "addresses", localField: "userId", foreignField: "userId", as: "addressDoc" } },
        { $unwind: "$addressDoc" }, 
        { $unwind: "$addressDoc.details" },
        { $match: { $expr: { $eq: ["$address", "$addressDoc.details._id"] } } },
        { $unwind: "$orderItems" },
        { 
            $group: {
                _id: "$addressDoc.details.city",
                totalSales: { $sum: { $multiply: ["$orderItems.quantity", "$orderItems.discountPrice"] } }
            }
        },
        { $project: { location: "$_id", totalSales: 1, _id: 0 } },
        { $sort: { totalSales: -1 } },
        { $limit: 6 }
    ]);

    const locationChartData = {
        labels: salesByLocation.map(loc => loc.location || "Unknown"),
        series: salesByLocation.map(loc => loc.totalSales || 0)
    };
        
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        admin: req.session.admin,
        chartLabels: Object.keys(summary),
        chartData: Object.values(summary),
        revenueLabels,
        revenueData, 
        bestSellingProducts,
        topCategories,
        brandData,
        locationChartData,
        currentFilter: filter
    });
};

export default {loadDashboard}
