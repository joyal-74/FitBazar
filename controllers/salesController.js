import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Order from '../model/orderModel.js';
import {salesReportPDF, salesReportExcel} from '../helpers/salesReport.js';
import { INTERNAL_SERVER_ERROR } from '../config/statusCodes.js';

const dateFilterFun = async (filter, startDate, endDate)=> {
    let dateFilter = {};

    const today = new Date();
    
    switch(filter) {
        case 'today':
            dateFilter = { 
                createdAt: { 
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lte: new Date(today.setHours(23, 59, 59, 999))
                } 
            };
            break;
        case 'week':
            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            dateFilter = {
                createdAt: {
                    $gte: new Date(firstDayOfWeek.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                }
            };
            break;
        case 'month':
            dateFilter = {
                createdAt: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                    $lte: new Date()
                }
            };
            break;
        case 'year':
            dateFilter = {
                createdAt: {
                    $gte: new Date(today.getFullYear(), 0, 1),
                    $lte: new Date()
                }
            };
            break;
        case 'custom':
            if (startDate && endDate) {
                dateFilter = {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                    }
                };
            }
            break;
        default:
            dateFilter = {
                createdAt: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                    $lte: new Date()
                }
            };
    }
    return dateFilter;
}

const loadSalesReport = async (req, res) => {
    try {
        const filter = req.query.filter || '';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        let filterQueryString = '';
        if (filter) {
            filterQueryString += `&filter=${filter}`;
            if (filter === 'custom' && startDate && endDate) {
                filterQueryString += `&startDate=${startDate}&endDate=${endDate}`;
            }
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const dateFilter = await dateFilterFun(filter, startDate, endDate);

        const productSales = await Order.aggregate([
            { $match: dateFilter },
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
                    totalDiscounts: { $sum: '$coupon' },
                    totalAmount: { $sum: '$price' }
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

        const summary = {
            totalOrders: productSales.reduce((sum, p) => sum + p.totalOrders, 0),
            totalDiscounts: productSales.reduce((sum, p) => sum + p.totalDiscounts, 0),
            totalAmount: productSales.reduce((sum, p) => sum + p.totalAmount, 0)
        };

        const salesData = await Order.find(dateFilter).populate('product').populate('userId').sort({createdAt : -1}).skip(skip).limit(limit);
        const totalSales = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalSales / limit);

        res.render('admin/sales', {
            title: 'Sales Report',
            summary,
            salesData,
            filterQueryString,
            currentPage: page, 
            totalPages
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.status(INTERNAL_SERVER_ERROR).send('Server Error');
    }
};

const generateSalesReportPDF = async (req, res) => {
    try {
        const { range, start, end } = req.query;

        const dateFilter = await dateFilterFun(range, start, end);

        const salesData = await Order.find(dateFilter).populate('product').populate('userId')

        const htmlContent = salesReportPDF(salesData);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent);

        const pdfPath = path.join(process.cwd(), 'sales-report.pdf');
        await page.pdf({ path: pdfPath, format: 'A4' });

        await browser.close();

        res.download(pdfPath, 'Sales_Report.pdf', (err) => {
            if (err) console.error('Error sending PDF:', err);
            fs.unlinkSync(pdfPath);
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate report' });
    }
};

const downloadSalesReportExcel = async (req, res) => {
    try {
        const { range, start, end } = req.query;

        const dateFilter = await dateFilterFun(range, start, end);

        const salesData = await Order.find(dateFilter)
            .populate('product')
            .populate('userId')
        
        const filePath = await salesReportExcel(salesData);

        res.download(filePath, 'Sales_Report.xlsx', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(INTERNAL_SERVER_ERROR).send('Error downloading the file');
            }
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
};

export default { loadSalesReport, generateSalesReportPDF, downloadSalesReportExcel };