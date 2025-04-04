import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const salesReportPDF = (salesData) => {

    let totalOrders = salesData.length;
    let totalAmount = salesData.reduce((sum, order) => sum + order.discountPrice, 0);
    let totalDiscounts = salesData.reduce((sum, order) => sum + (order.coupon || 0), 0);
    let netSales = totalAmount - totalDiscounts;

    let rows = salesData.map((order, index) => `
        <tr class="text-center">
            <td>${index + 1}</td>
            <td>${order.orderId}</td>
            <td>${order.userId?.name || 'N/A'}</td>
            <td>${new Date(order.createdAt).toISOString().split('T')[0]}</td>
            <td>${order.product?.productId || 'N/A'}</td>
            <td>${order.quantity}</td>
            <td>₹${order.discountPrice}</td>
            <td>₹${order.coupon}</td>
            <td>${order.paymentMethod}</td>
            <td>${order.status}</td>
        </tr>
    `).join('');

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 0.5px solid black; padding: 8px; text-align: center; font-size : 0.7rem }
            th { background-color: #f2f2f2; font-size : 0.7rem }
        </style>
    </head>
    <body>
        <h2 style="text-align : center">FitBazar Sales Report</h2>

        <table>
            <thead>
                <tr>
                    <th>SL No</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Order Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Amount (₹)</th>
                    <th>Discount (₹)</th>
                    <th>Payment</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <h3 style="margin-top: 30px;">Sales Summary</h3>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Total Orders</th>
                    <th>Total Amount (₹)</th>
                    <th>Total Discounts (₹)</th>
                    <th>Net Sales (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${totalOrders}</td>
                    <td>₹${totalAmount.toLocaleString('en-IN')}</td>
                    <td>₹${totalDiscounts.toLocaleString('en-IN')}</td>
                    <td><strong>₹${netSales.toLocaleString('en-IN')}</strong></td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>`;
};


export const salesReportExcel = async (salesData) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'SL No', key: 'slNo', width: 10 },
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Order Date', key: 'orderDate', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Amount (₹)', key: 'amount', width: 15 },
        { header: 'Discount (₹)', key: 'discount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Status', key: 'status', width: 15 }
    ];


    salesData.forEach((order, index) => {
        worksheet.addRow({
            slNo: index + 1,
            orderId: `#${order.orderId}`,
            customer: order.userId?.name || 'N/A',
            orderDate: new Date(order.createdAt).toISOString().split('T')[0],
            product: order.product?.name || 'N/A',
            quantity: order.quantity,
            amount: order.discountPrice.toLocaleString('en-IN'),
            discount: (order.coupon || 0).toLocaleString('en-IN'),
            paymentMethod: order.paymentMethod,
            status: order.status
        });
    });

    const totalOrders = salesData.length;
    const totalAmount = salesData.reduce((sum, order) => sum + order.discountPrice, 0);
    const totalDiscounts = salesData.reduce((sum, order) => sum + (order.coupon || 0), 0);
    const netSales = totalAmount - totalDiscounts;

    worksheet.addRow({});
    worksheet.addRow({ slNo: 'Summary:', orderId: 'Total Orders', amount: totalOrders });
    worksheet.addRow({ slNo: '', orderId: 'Total Amount (₹)', amount: `₹${totalAmount.toLocaleString('en-IN')}` });
    worksheet.addRow({ slNo: '', orderId: 'Total Discounts (₹)', amount: `₹${totalDiscounts.toLocaleString('en-IN')}` });
    worksheet.addRow({ slNo: '', orderId: 'Net Sales (₹)', amount: `₹${netSales.toLocaleString('en-IN')}` });

    // 🔹 Save the File
    const filePath = path.join(__dirname, '../invoices/sales_report.xlsx');
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
};
