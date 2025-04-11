import Order from "../model/orderModel.js";
import Wallet from "../model/walletModel.js";
import moment from 'moment';

const loadDashboard = async (req, res) => {

    const transactions = await Wallet.find();

    const summary = {
    'Add Money to Wallet': 0,
    'Refund Product': 0,
    'Product Purchase': 0
    };

    transactions.forEach(tx => {
    if (tx.type === 'add_money') summary['Add Money to Wallet'] += tx.amount;
    else if (tx.type === 'refund') summary['Refund Product'] += tx.amount;
    else if (tx.type === 'product_purchase') summary['Product Purchase'] += tx.amount;
    });


    const labels = [];
    const data = [];
  
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days');
      const start = day.startOf('day').toDate();
      const end = day.endOf('day').toDate();
  
      const orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
      });
  
      const dailyRevenue = orders.reduce((sum, order) => sum + order.discountPrice, 0);
      labels.push(day.format('ddd'));
      data.push(dailyRevenue);
    }

    const bestSellingProducts = await Order.aggregate([
        {
          $group: {
            _id: "$product",
            totalSold: { $sum: "$quantity" }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        {
          $unwind: "$productInfo"
        },
        {
          $project: {
            _id: 0,
            name: "$productInfo.productId",
            totalSold: 1
          }
        },
        {
          $sort: { totalSold: -1 }
        },
        {
          $limit: 10
        }
      ]);


      const topCategories = await Order.aggregate([
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.category",
            totalSold: { $sum: 1 }
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
            categoryName: "$categoryInfo.name",
            totalSold: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);
      
      const bestSellingBrands = await Order.aggregate([
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
            _id: '$productInfo.brand',
            totalSold: { $sum: '$quantity' }
          }
        },
        {
          $sort: { totalSold: -1 }
        },
        {
          $limit: 5 // or more if you want
        }
      ]);
      

      const brandData = {
        labels: bestSellingBrands.map(item => item._id),         // Brand names
        series: bestSellingBrands.map(item => item.totalSold)    // Quantities
      };


      const salesByLocation = await Order.aggregate([
        {
          $lookup: {
            from: "addresses",
            localField: "userId",
            foreignField: "userId",
            as: "addressDoc"
          }
        },
        { $unwind: "$addressDoc" },        // Unwind the address document
        { $unwind: "$addressDoc.details" },// Unwind the details array
        {
          $match: {
            $expr: {
              $eq: ["$address", "$addressDoc.details._id"] // Match on detail _id
            }
          }
        },
        {
          $group: {
            _id: "$addressDoc.details.city", 
            totalSales: { $sum: "$price" }
          }
        },
        {
          $project: {
            location: "$_id",
            totalSales: 1,
            _id: 0
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
      ]);
      

      const locationChartData = {
        labels: salesByLocation.map(loc => loc.location || "Unknown"),
        series: salesByLocation.map(loc => loc.totalSales)
      };
      
        
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        admin: req.session.admin,
        chartLabels: Object.keys(summary),
        chartData: Object.values(summary),
        revenueLabels: labels,
        revenueData: data, 
        bestSellingProducts,
        topCategories,
        brandData,
        locationChartData
    });
};

export default {loadDashboard}
