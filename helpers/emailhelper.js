import nodemailer from "nodemailer";

const sendEmail = async (to, subject, htmlContent) => {
    if (!process.env.EMAIL || !process.env.PASSWORD) {
        console.error("Missing email credentials in environment variables.");
        throw new Error("Server email configuration error.");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to,
        subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully to", to);
        return true;
    } catch (error) {
        console.error("❌ Email sending error:", error);
        throw new Error("Failed to send email.");
    }
};

export default sendEmail ;
