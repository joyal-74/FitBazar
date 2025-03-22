const getOtpEmailTemplate = (email, otp) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2118cc;">FitBazar Account Verification</h2>
            <p>Hello,</p>
            <p>Your registered FitBazar email is:</p>
            <p style="font-size: 12px; font-weight: bold; color:#2118cc;">${email}</p>
            <p>Your One-Time Password (OTP) for account verification:</p>
            <p style="font-size: 24px; font-weight: bold; color:#2118cc;">${otp}</p>
            <p>Please use this OTP to complete your registration process.</p>
            <h5>If you did not request this registration, please contact - 
                <a href="mailto:fitbazarapplication@gmail.com">fitbazarapplication@gmail.com</a>
            </h5>
            <p>Best regards,<br>The FitBazar Team</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
        </div>
    `;
};

const getOtpResetEmailTemplate = (email, otp) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #cc2118;">FitBazar Password Reset</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for the FitBazar account:</p>
            <p style="font-size: 12px; font-weight: bold; color:#cc2118;">${email}</p>
            <p>Use the below OTP reset your password:</p>
            <p style="font-size: 24px; font-weight: bold; color:#2118cc;">${otp}</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Best regards,<br>The FitBazar Team</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
        </div>
    `;
};


export default { getOtpEmailTemplate, getOtpResetEmailTemplate };
