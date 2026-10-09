import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import prisma from "../config/db.js";
import { userSchema } from "../middleware/UserJoi.js";
import crypto from "crypto";
import { sendResetPasswordLink } from "../utils/EmailService.js";

dotenv.config();

export const Register = async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "User already exist. Go to Login Page" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
      },
    });

    const responseData = {
      id: user.user_id,
      name: user.name,
      email: user.email,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email },
      include: {
        userrole: {
          where: { deleted_at: null },
          include: {
            roleuser: {
              include: {
                roleaccess: {
                  where: { deleted_at: null },
                  include: {
                    accessrole: true,
                  },
                },
              },
            },
          },
        },
        usermembership: true,
        userbranch: {
          where: { deleted_at: null },
          include: {
            branchuser: true,
          },
        },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found. Go to Register Page" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const jwtToken = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ExpiresInTime },
    );

    const stamps = [];
    user.userrole.forEach((ur) => {
      if (ur.roleuser && ur.roleuser.roleaccess) {
        ur.roleuser.roleaccess.forEach((ra) => {
          if (ra.accessrole && ra.accessrole.name) {
            stamps.push(ra.accessrole.name);
          }
        });
      }
    });

    const roleName =
      user.userrole.length > 0 ? user.userrole[0]?.roleuser?.name : null;

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token: jwtToken,
      data: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: roleName,
        stamps: stamps,
        hasMembership: !!user.usermembership,
        branches: user.userbranch.map((ub) => ({
          branch_id: ub.branchuser?.branch_id,
          name: ub.branchuser?.name,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        userrole: {
          where: { deleted_at: null },
          include: {
            roleuser: {
              include: {
                roleaccess: {
                  where: { deleted_at: null },
                  include: {
                    accessrole: true,
                  },
                },
              },
            },
          },
        },
        usermembership: true,
        userbranch: {
          where: { deleted_at: null },
          include: {
            branchuser: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const stamps = [];
    user.userrole.forEach((ur) => {
      if (ur.roleuser && ur.roleuser.roleaccess) {
        ur.roleuser.roleaccess.forEach((ra) => {
          if (ra.accessrole && ra.accessrole.name) {
            stamps.push(ra.accessrole.name);
          }
        });
      }
    });

    const roleName =
      user.userrole.length > 0 ? user.userrole[0]?.roleuser?.name : null;

    return res.status(200).json({
      success: true,
      data: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: roleName,
        stamps: stamps,
        hasMembership: !!user.usermembership,
        branches: user.userbranch.map((ub) => ({
          branch_id: ub.branchuser?.branch_id,
          name: ub.branchuser?.name,
        })),
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const reset_token_expiry = new Date(
      Date.now() + Number(process.env.RESET_TOKEN_EXPIRY) * 1000,
    );

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: reset_token_expiry,
      },
    });

    try {
      await sendResetPasswordLink(email, resetToken);
    } catch (error) {
      console.error("Email failed to send", error);
    }

    return res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const ResetPassword = async (req, res) => {
  try {
    const { new_password, token } = req.body;

    const user = await prisma.user.findFirst({
      where: { reset_token: token },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or Expired Reset token" });
    }

    if (
      !user.reset_token_expiry ||
      new Date(user.reset_token_expiry) < new Date()
    ) {
      return res
        .status(400)
        .json({
          message: "Reset token has expired. Please request a new one.",
        });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res
        .status(400)
        .json({ valid: false, message: "No token provided" });
    }

    const user = await prisma.user.findFirst({
      where: { reset_token: token },
    });

    if (!user) {
      return res.status(200).json({
        valid: false,
        message: "Invalid or expired reset link.",
      });
    }

    if (
      !user.reset_token_expiry ||
      new Date(user.reset_token_expiry) < new Date()
    ) {
      return res.status(200).json({
        valid: false,
        message: "Reset link has expired. Please request a new one.",
      });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ valid: false, message: "Internal Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { user_id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};