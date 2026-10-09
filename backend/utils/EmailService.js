import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: parseInt(process.env.MAILTRAP_PORT),
    auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD
    },
})

const sendEmail = async (to, subject, htmlcontent) => {
    const mailOptions = {
        from: 'Library Management System <no-reply@library.com',
        to: to,
        subject: subject,
        html: htmlcontent
    }
    
    try {
        const info = await transporter.sendMail(mailOptions)    
        return {success: true, messageid: info.messageId}

    } catch (error) {
        console.error("❌ Email send error:", error);
    }

}

export const sendResetPasswordLink = async (email, token) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #1a56db; text-align: center;">Library Management System</h2>
            <hr />
            <p>Hello,</p>
            <p>We received a request to reset your password.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #1a56db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 14px; color: #666;">
                This link will expire in <strong>15 minutes</strong>.
            </p>
            <p style="font-size: 14px; color: #666;">
                If you didn't request this, please ignore this email.
            </p>
            <hr />
            <p style="font-size: 12px; color: #999; text-align: center;">
                &copy; 2026 Library Management System. All rights reserved.
            </p>
        </div>
    `;

    return sendEmail(email, "Reset Password Request", htmlContent)
}