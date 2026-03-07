import type { Request, Response } from "express";
import Purchase from "../models/purchase.model.js";
import PurchaseItem from "../models/purchaseItem.model.js";
import Product from "../models/product.model.js";

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const { supplierName, paymentMethod, items } = req.body;

    const storeId = (req as any).user.storeId;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Purchase items required" });
    }

    let totalAmount = 0;

    // create purchase
    const purchase = await Purchase.create({
      supplierName,
      paymentMethod,
      storeId,
      totalAmount: 0,
    });

    for (const item of items) {
      const { productId, quantity, buyPrice } = item;

      const total = quantity * buyPrice;

      totalAmount += total;

      // save purchase item
      await PurchaseItem.create({
        purchaseId: purchase._id,
        productId,
        quantity,
        buyPrice,
        total,
      });

      // update product stock
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: quantity },
      });
    }

    purchase.totalAmount = totalAmount;
    await purchase.save();

    res.status(201).json({
      message: "Purchase created successfully",
      purchase,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating purchase",
    });
  }
};
// export const getPurchases = async (req: Request, res: Response) => {
//   try {
//     const user = (req as any).user;

//     if (!user || !user.storeId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized. Store ID missing.",
//       });
//     }

//     const purchases = await Purchase.find({ storeId: user.storeId })
//       .populate("supplierId") // Make sure this matches your schema
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       data: purchases,
//     });
//   } catch (error) {
//     console.error("Get Purchases Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch purchases",
//     });
//   }
// };

export const getPurchases = async (req: any, res: Response) => {
  try {
    if (!req.user?.storeId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const purchases = await Purchase.find({ storeId: req.user.storeId });

    return res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
    });
  }
};

export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findById(id)
      .populate("supplierId")
      .populate("products.productId");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase",
      error,
    });
  }
};
