import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const generateInvoicePDF = async (order, address) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const date = new Date(order.createdAt).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const content = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice - ${order._id}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px 40px;
                        color: #333;
                    }
                    h3 {
                        text-align: center;
                        color:#3C1549;
                        margin-bottom: 20px;
                    }
                    .order-details, .address-details {
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        background-color:#ffffff;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        padding: 12px;
                        border: 1px solid #ddd;
                        text-align: left;
                        font-size : 0.9em;
                    }
                    th {
                        background-color:#ffffff;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color:#ffffff;
                    }
                    .total {
                        text-align: right;
                        font-size: 1.2rem;
                        font-weight: bold;
                        padding-top: 10px;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #888;
                        font-size: 0.9rem;
                    }
                </style>
            </head>
            <body>
                <h3>Tax Invoice</h3>

                <!-- Order Details -->
                <div class="order-details">
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Total Price:</strong> ₹${(order.discountPrice).toFixed(2)}</p>
                </div>

                <!-- Address Details -->
                <div class="address-details">
                    <h4>Billing Address</h4>
                    <p><strong>Name:</strong> ${address?.name || 'N/A'}</p>
                    <p>
                        <strong>Address:</strong> 
                        ${address?.addressLine1 || ''}, 
                        ${address?.addressLine2 || ''}, 
                        ${address?.city || ''}, 
                        ${address?.state || ''} - ${address?.pincode || ''}
                    </p>
                    <p><strong>Phone:</strong> ${address?.phone || 'N/A'}</p>
                </div>

                <!-- Order Items -->
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Base Price(₹)</th>
                            <th>Coupon Discount(₹)</th>
                            <th>GST/Tax(₹)</th>
                            <th>Total(₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>${order.product.name}</td>
                            <td>${order.quantity}</td>
                            <td>₹${(order.price / 1.18).toFixed(2)}</td>
                            <td>₹${(order.coupon).toFixed(2)}</td>
                            <td>₹${(order.price - order.price / 1.18).toFixed(2)}</td>
                            <td>₹${((order.price - order.coupon) * order.quantity).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Delivery Charges</td>
                            <td>-</td>
                            <td>₹${order.delivery ? '39.00' : '0.00'}</td> 
                            <td>-</td> 
                            <td>-</td>
                            <td>₹${order.delivery ? '39.00' : '0.00'}</td>
                        </tr>
                    </tbody>
                </table>


                <!-- Total Amount -->
                <div class="total">
                    Total Amount: ₹${(order.price - order.coupon + order.delivery).toFixed(2)}
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p>Thank you for shopping with FitBazar!</p>
                </div>
            </body>
        </html>
    `;

    await page.setContent(content, { waitUntil: 'domcontentloaded' });

    const filePath = path.join(__dirname, `../invoices/invoice-${order._id}.pdf`);

    await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '5px', right: '5px', bottom: '5px', left: '5px' }
    });

    await browser.close();

    return filePath;
};

