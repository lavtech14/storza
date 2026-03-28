// import type { Response, NextFunction } from "express";

// export const authorize =
//   (...allowedRoles: string[]) =>
//   (req: any, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ message: "Not authenticated" });
//     }

//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     next();
//   };
import type { Response, NextFunction } from "express";
import type { Request } from "express";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    storeId: string;
    role: string;
  };
}

export const authorize =
  (...allowedRoles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    // ✅ Check authentication
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ Check role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
