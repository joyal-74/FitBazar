const getSalesData = async (range, startDate, endDate) => {
    // Example: Fetch data from your database based on range (daily, weekly, etc.)
    return {
        summary: {
            totalOrders: 150,
            totalAmount: 50000,
            totalDiscounts: 5000
        },
        products: [
            { productName: 'Product A', totalOrders: 50, totalDiscounts: 1000, totalAmount: 20000 },
            { productName: 'Product B', totalOrders: 100, totalDiscounts: 4000, totalAmount: 30000 }
        ],
        paymentMethods: [
            { paymentMethod: 'Credit Card', totalOrders: 90 },
            { paymentMethod: 'Cash', totalOrders: 60 }
        ],
        orderStatusCount: [
            { status: 'Delivered', totalOrders: 120 },
            { status: 'Pending', totalOrders: 30 }
        ],
        categorySales: [
            { categoryName: 'Electronics', totalOrders: 80, totalSales: 35000, bestSellingProduct: 'Smartphone' },
            { categoryName: 'Clothing', totalOrders: 70, totalSales: 15000, bestSellingProduct: 'T-Shirt' }
        ]
    };
};

// Generate PDF report
const downloadPDF = async (req, res) => {
    const { range, start, end } = req.query;

    // Fetch data based on range and dates
    const data = await getSalesData(range, start, end);

    // Create a new PDF document
    const doc = new PDFDocument();
    let filename = `sales-report-${range}-${new Date().toISOString().split('T')[0]}.pdf`;
    filename = encodeURIComponent(filename);

    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(16).text('Sales Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Filter: ${range === 'custom' ? `${start} to ${end}` : range}`);
    doc.moveDown();

    // Summary
    doc.text('Summary', { underline: true });
    doc.text(`Total Orders: ${data.summary.totalOrders.toLocaleString()}`);
    doc.text(`Total Amount: ₹ ${data.summary.totalAmount.toLocaleString()}`);
    doc.text(`Total Discounts: ₹ ${data.summary.totalDiscounts.toLocaleString()}`);
    doc.text(`Net Sales: ₹ ${(data.summary.totalAmount - data.summary.totalDiscounts).toLocaleString()}`);
    doc.moveDown();

    // Products Report
    doc.text('Products Report', { underline: true });
    data.products.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.productName}: Orders: ${product.totalOrders}, Discounts: ₹ ${product.totalDiscounts.toLocaleString()}, Amount: ₹ ${product.totalAmount.toLocaleString()}`);
    });
    doc.moveDown();

    // Payment Methods
    doc.text('Payment Methods', { underline: true });
    data.paymentMethods.forEach((method, index) => {
        doc.text(`${index + 1}. ${method.paymentMethod}: ${method.totalOrders}`);
    });
    doc.moveDown();

    // Order Status
    doc.text('Order Status', { underline: true });
    data.orderStatusCount.forEach((order, index) => {
        doc.text(`${index + 1}. ${order.status}: ${order.totalOrders}`);
    });
    doc.moveDown();

    // Category Sales
    doc.text('Category Sales', { underline: true });
    data.categorySales.forEach((category, index) => {
        doc.text(`${index + 1}. ${category.categoryName}: Orders: ${category.totalOrders}, Sales: ₹ ${category.totalSales.toLocaleString()}, Best Product: ${category.bestSellingProduct}`);
    });

    // Finalize the PDF
    doc.end();
};

// Generate Excel report
const downloadExcel = async (req, res) => {
    const { range, start, end } = req.query;

    // Fetch data based on range and dates
    const data = await getSalesData(range, start, end);

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    let filename = `sales-report-${range}-${new Date().toISOString().split('T')[0]}.xlsx`;
    filename = encodeURIComponent(filename);

    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Define columns
    worksheet.columns = [
        { header: 'Section', key: 'section', width: 20 },
        { header: 'Details', key: 'details', width: 50 }
    ];

    // Add data
    worksheet.addRow(['Filter', range === 'custom' ? `${start} to ${end}` : range]);
    worksheet.addRow([]);

    // Summary
    worksheet.addRow(['Summary', '']);
    worksheet.addRow(['', `Total Orders: ${data.summary.totalOrders.toLocaleString()}`]);
    worksheet.addRow(['', `Total Amount: ₹ ${data.summary.totalAmount.toLocaleString()}`]);
    worksheet.addRow(['', `Total Discounts: ₹ ${data.summary.totalDiscounts.toLocaleString()}`]);
    worksheet.addRow(['', `Net Sales: ₹ ${(data.summary.totalAmount - data.summary.totalDiscounts).toLocaleString()}`]);
    worksheet.addRow([]);

    // Products Report
    worksheet.addRow(['Products Report', '']);
    worksheet.columns = [
        { header: 'SL No', key: 'slNo', width: 10 },
        { header: 'Product Name', key: 'productName', width: 30 },
        { header: 'Orders', key: 'orders', width: 10 },
        { header: 'Coupon (₹)', key: 'coupon', width: 15 },
        { header: 'Amount (₹)', key: 'amount', width: 15 }
    ];
    data.products.forEach((product, index) => {
        worksheet.addRow({
            slNo: index + 1,
            productName: product.productName,
            orders: product.totalOrders,
            coupon: product.totalDiscounts,
            amount: product.totalAmount
        });
    });
    worksheet.addRow([]);

    // Payment Methods
    worksheet.addRow(['Payment Methods', '']);
    worksheet.columns = [
        { header: 'SL No', key: 'slNo', width: 10 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Orders', key: 'orders', width: 10 }
    ];
    data.paymentMethods.forEach((method, index) => {
        worksheet.addRow({
            slNo: index + 1,
            paymentMethod: method.paymentMethod,
            orders: method.totalOrders
        });
    });
    worksheet.addRow([]);

    // Order Status
    worksheet.addRow(['Order Status', '']);
    worksheet.columns = [
        { header: 'SL No', key: 'slNo', width: 10 },
        { header: 'Order Status', key: 'status', width: 20 },
        { header: 'Total Orders', key: 'totalOrders', width: 15 }
    ];
    data.orderStatusCount.forEach((order, index) => {
        worksheet.addRow({
            slNo: index + 1,
            status: order.status,
            totalOrders: order.totalOrders
        });
    });
    worksheet.addRow([]);

    // Category Sales
    worksheet.addRow(['Category Sales', '']);
    worksheet.columns = [
        { header: 'SL No', key: 'slNo', width: 10 },
        { header: 'Category Name', key: 'categoryName', width: 20 },
        { header: 'Orders', key: 'orders', width: 10 },
        { header: 'Sales (₹)', key: 'sales', width: 15 },
        { header: 'Best Selling Product', key: 'bestProduct', width: 30 }
    ];
    data.categorySales.forEach((category, index) => {
        worksheet.addRow({
            slNo: index + 1,
            categoryName: category.categoryName,
            orders: category.totalOrders,
            sales: category.totalSales,
            bestProduct: category.bestSellingProduct
        });
    });

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
};
