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
                    h1 {
                        text-align: center;
                        color:#3e106a;
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
                <h1>FitBazar Invoice</h1>

                <!-- Order Details -->
                <div class="order-details">
                    <p><strong>Order ID:</strong> ${order._id}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Total Price:</strong> ₹${order.totalPrice.toFixed(2)}</p>
                </div>

                <!-- Address Details -->
                <div class="address-details">
                    <h3>Billing Address</h3>
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
                            <th>Quantity</th>
                            <th>Price (₹)</th>
                            <th>Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.orderItems.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.product.name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price.toFixed(2)}</td>
                                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Total Amount -->
                <div class="total">
                    Total Amount: ₹${order.totalPrice.toFixed(2)}
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
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    return filePath;
};