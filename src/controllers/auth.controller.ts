import type { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { io } from "../server.js";

// export const register = async (req: Request, res: Response) => {
//   try {
//     const { name, email, password, role, storeId } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         message: "Name, email and password are required",
//       });
//     }

//     const allowedRoles = ["admin", "storeOwner", "staff"];

//     if (role && !allowedRoles.includes(role)) {
//       return res.status(400).json({
//         message: "Invalid role",
//       });
//     }

//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//       return res.status(400).json({
//         message: "User already exists",
//       });
//     }

//     const user = await User.create({
//       name,
//       email,
//       password,
//       role: role || "staff",
//       storeId,
//     });
//     io.emit("userCreated", user);
//     const { password: _password, ...userData } = user.toObject();

//     res.status(201).json({
//       message: "User created successfully",
//       user: userData,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error registering user",
//     });
//   }
// };

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET as string,
    ) as any;

    const user = await User.findById(decoded.userId);

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }
};
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, storeId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
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
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.isDeleted) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // ✅ check active
    if (!user.isActive) {
      return res.status(403).json({
        message: "User is inactive",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 🔥 TOKENS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error); // 👈 ADD THIS

    res.status(500).json({
      message: "Error logging in",
      error, // 👈 TEMPORARY
    });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", search = "", storeId } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);

    const filter: any = {
      isDeleted: { $ne: true },
    };

    /* Store Filter */

    if (storeId) {
      filter.storeId = storeId;
    }

    /* Search */

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalUsers = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select("-password")
      .populate("storeId", "name")
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: users,
      pagination: {
        total: totalUsers,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, storeId, isActive } = req.body;

    const user = await User.findById(id).select("+password");

    if (!user || user.isDeleted) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.role = role ?? user.role;
    user.storeId = storeId ?? user.storeId;
    user.isActive = isActive ?? user.isActive;

    if (password) {
      user.password = password;
    }

    await user.save();

    // ✅ FETCH AGAIN WITH POPULATE
    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("storeId", "name");

    // ✅ SOCKET ALSO SHOULD SEND POPULATED
    io.emit("userUpdated", populatedUser);

    res.status(200).json({
      message: "User updated successfully",
      user: populatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating user",
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = new Date();

    await user.save();
    io.emit("userDeleted", user._id);
    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
    });
  }
};
