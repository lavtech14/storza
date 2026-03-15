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

    let subtotal = 0;
    let totalGST = 0;
    let totalAmount = 0;

    // create purchase
    const purchase = await Purchase.create({
      supplierName,
      paymentMethod,
      storeId,
      subtotal: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      totalAmount: 0,
    });

    for (const item of items) {
      const { productId, quantity, buyPrice } = item;

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const gst = product.gst || 0;

      const itemSubtotal = quantity * buyPrice;
      const gstAmount = (itemSubtotal * gst) / 100;
      const total = itemSubtotal + gstAmount;

      subtotal += itemSubtotal;
      totalGST += gstAmount;
      totalAmount += total;

      // save purchase item
      await PurchaseItem.create({
        purchaseId: purchase._id,
        productId,
        quantity,
        buyPrice,
        subtotal: itemSubtotal,
        gst,
        gstAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total,
      });

      // update stock
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: quantity },
        buyingPrice: buyPrice,
      });
    }

    purchase.subtotal = subtotal;
    purchase.gstAmount = totalGST;
    purchase.cgst = totalGST / 2;
    purchase.sgst = totalGST / 2;
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

export const getPurchases = async (req: any, res: Response) => {
  try {
    if (!req.user?.storeId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const storeId = req.user.storeId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Build the filter
    const filter: any = { storeId };

    // UNIVERSAL SEARCH - if search term exists, search across all fields
    if (search) {
      // Get purchase IDs that have products matching the search
      const matchingProductItems = await PurchaseItem.find()
        .populate({
          path: "productId",
          match: { name: { $regex: search, $options: "i" } },
          select: "name",
        })
        .lean();

      const purchaseIdsFromProducts = matchingProductItems
        .filter((item) => item.productId)
        .map((item) => item.purchaseId);

      // Universal search across all fields
      filter.$or = [
        { supplierName: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
        { _id: { $in: purchaseIdsFromProducts } },
        { "items.productName": { $regex: search, $options: "i" } },
      ];

      // Also search numeric fields if search is a number
      const searchNumber = parseFloat(search);
      if (!isNaN(searchNumber)) {
        filter.$or.push(
          { subtotal: searchNumber },
          { gstAmount: searchNumber },
          { totalAmount: searchNumber },
        );
      }
    }

    const purchases = await Purchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Purchase.countDocuments(filter);

    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase: any) => {
        const items = await PurchaseItem.find({
          purchaseId: purchase._id,
        })
          .populate("productId", "name")
          .lean();

        return {
          ...purchase,
          items,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: purchasesWithItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);

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
