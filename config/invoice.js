import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateInvoicePDF = async (order, address) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const date = new Date(order.createdAt).toLocaleString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    // Generate rows for each product
    const rows = order.orderItems.map((item, index) => {
        const basePrice = (item.discountPrice / 1.18).toFixed(2);
        const gstAmount = (item.discountPrice - basePrice).toFixed(2);
        const totalPrice = (item.discountPrice * item.quantity).toFixed(2);

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${item.product?.name || 'Unknown Product'}</td>
                <td>${item.quantity}</td>
                <td>₹${basePrice}</td>
                <td>₹${gstAmount}</td>
                <td>₹${totalPrice}</td>
            </tr>
        `;
    }).join('');

    // Total calculations
    const itemTotal = order.orderItems.reduce((acc, item) => {
        return acc + item.discountPrice * item.quantity;
    }, 0);

    const deliveryCharge = order.deliveryCharge || 0;
    const couponDiscount = order.coupon || 0;
    const finalTotal = itemTotal + deliveryCharge - couponDiscount;

    const content = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Invoice - ${order.orderId}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px 40px;
                    color: #333;
                }
                h3 {
                    text-align: center;
                    color: #3C1549;
                    margin-bottom: 20px;
                }
                .order-details, .address-details {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    background-color: #ffffff;
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
                    font-size: 0.9em;
                }
                th {
                    background-color: #ffffff;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #ffffff;
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
                .text-right {
                    text-align: right;
                }
            </style>
        </head>
        <body>
            <h3>Tax Invoice</h3>

            <!-- Order Details -->
            <div class="order-details">
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
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

            <!-- Order Items Table -->
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Base Price (₹)</th>
                        <th>GST/Tax (₹)</th>
                        <th>Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                    <tr>
                        <td colspan="5" class="text-right"><strong>Subtotal</strong></td>
                        <td>₹${itemTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="5" class="text-right"><strong>Delivery Charge</strong></td>
                        <td>₹${deliveryCharge.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="5" class="text-right"><strong>Coupon Discount</strong></td>
                        <td>- ₹${couponDiscount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Total Amount -->
            <div class="total">
                Total Payable: ₹${finalTotal.toFixed(2)}
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
