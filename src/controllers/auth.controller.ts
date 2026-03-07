import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// export const register = async (req: Request, res: Response) => {
//   try {
//     const { name, email, password, role, storeId } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role,
//       storeId,
//     });

//     res.status(201).json({ message: "User created successfully", user });
//   } catch (error) {
//     res.status(500).json({ message: "Error registering user", error });
//   }
// };

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, storeId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const allowedRoles = ["admin", "storeOwner", "staff"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "staff",
      storeId,
    });

    const { password: _password, ...userData } = user.toObject();

    res.status(201).json({
      message: "User created successfully",
      user: userData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error registering user",
    });
  }
};
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       {
//         userId: user._id,
//         storeId: user.storeId,
//         role: user.role,
//       },
//       process.env.JWT_SECRET as string,
//       { expiresIn: "7d" },
//     );

//     res.json({ message: "Login successful", token });
//   } catch (error) {
//     res.status(500).json({ message: "Error logging in", error });
//   }
// };

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        storeId: user.storeId,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error logging in",
    });
  }
};
