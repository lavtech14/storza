import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";

import Product from "../models/product.model.js";
import Sale from "../models/sale.model.js";
import Purchase from "../models/purchase.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

interface AuthRequest extends Request {
  user?: {
    storeId: string;
  };
}

router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;

    if (!storeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    /* PRODUCTS */

    const productStats = await Product.aggregate([
      {
        $match: { storeId: storeObjectId },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          lowStock: {
            $sum: {
              $cond: [
                { $lte: ["$quantity", { $ifNull: ["$minStockAlert", 5] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalProducts = productStats[0]?.totalProducts || 0;
    const lowStock = productStats[0]?.lowStock || 0;

    /* SALES */

    const salesStats = await Sale.aggregate([
      {
        $match: { storeId: storeObjectId },
      },
      {
        $facet: {
          totalSales: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],

          todaySales: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],

          monthlyRevenue: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  ),
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],

          recentSales: [{ $sort: { createdAt: -1 } }, { $limit: 5 }],
        },
      },
    ]);

    const totalSales = salesStats[0].totalSales[0]?.count || 0;
    const salesRevenue = salesStats[0].totalSales[0]?.revenue || 0;

    const todaySales = salesStats[0].todaySales[0]?.count || 0;
    const todayRevenue = salesStats[0].todaySales[0]?.revenue || 0;

    const monthlyRevenue = salesStats[0].monthlyRevenue[0]?.revenue || 0;

    const recentSales = salesStats[0].recentSales || [];

    /* PURCHASES */

    const purchaseStats = await Purchase.aggregate([
      {
        $match: { storeId: storeObjectId },
      },
      {
        $facet: {
          totalPurchases: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: "$totalAmount" },
              },
            },
          ],

          recentPurchases: [{ $sort: { purchaseDate: -1 } }, { $limit: 5 }],
        },
      },
    ]);

    const totalPurchases = purchaseStats[0].totalPurchases[0]?.count || 0;
    const purchaseAmount = purchaseStats[0].totalPurchases[0]?.amount || 0;

    const recentPurchases = purchaseStats[0].recentPurchases || [];

    /* PROFIT */

    const profit = salesRevenue - purchaseAmount;

    res.json({
      totalProducts,
      lowStock,

      totalSales,
      salesRevenue,

      todaySales,
      todayRevenue,

      monthlyRevenue,

      totalPurchases,
      purchaseAmount,

      profit,

      recentSales,
      recentPurchases,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    res.status(500).json({
      message: "Failed to load dashboard",
    });
  }
});

export default router;
