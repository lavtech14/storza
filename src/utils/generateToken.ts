import jwt from "jsonwebtoken";

export const generateAccessToken = (user: any) => {
  return jwt.sign(
    {
      userId: user._id,
      storeId: user.storeId,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }, // ✅ your choice
  );
};

export const generateRefreshToken = (user: any) => {
  return jwt.sign(
    {
      userId: user._id,
    },
    process.env.REFRESH_SECRET as string,
    { expiresIn: "7d" },
  );
};
