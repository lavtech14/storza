// import type { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";

// interface AuthRequest extends Request {
//   user?: {
//     userId: string;
//     storeId: string;
//     role: string;
//   };
// }

// export const protect = (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({ message: "Not authorized" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

//     req.user = decoded;

//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    storeId: string;
    role: string;
  };
}

interface JwtPayload {
  userId: string;
  storeId: string;
  role: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1] as string;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as JwtPayload;

    const user = await User.findById(decoded.userId).select("_id storeId role");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ FIX: handle possible undefined
    if (!user.storeId) {
      return res.status(401).json({ message: "Store not found" });
    }

    req.user = {
      userId: user._id.toString(),
      storeId: user.storeId.toString(),
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};
