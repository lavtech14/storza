import { Router } from "express";
import Sale from "../models/sale.model.js";

const router = Router();

router.get("/sales-last-7-days", async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const sales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load sales analytics" });
  }
});

export default router;
