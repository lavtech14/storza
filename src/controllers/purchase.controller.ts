import type { Request, Response } from "express";
import mongoose from "mongoose";
import Purchase from "../models/purchase.model.js";
import PurchaseItem from "../models/purchaseItem.model.js";
import Product from "../models/product.model.js";
import { io } from "../server.js";

export const createPurchase = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { supplierName, paymentMethod, items } = req.body;
    const storeId = (req as any).user.storeId;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase items required",
      });
    }

    /* CREATE PURCHASE */
    const purchase = new Purchase({
      supplierName,
      paymentMethod,
      storeId,
      subtotal: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      totalAmount: 0,
    });

    await purchase.save({ session });

    let subtotal = 0;
    let totalGST = 0;

    const purchaseItems: any[] = [];

    for (const item of items) {
      const { productId, quantity, buyPrice } = item;

      if (!productId || quantity <= 0 || buyPrice <= 0) {
        throw new Error("Invalid purchase item");
      }

      const product = await Product.findById(productId).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      const gst = product.gst || 0;

      const itemSubtotal = buyPrice * quantity;
      const gstAmount = (itemSubtotal * gst) / 100;
      const total = itemSubtotal + gstAmount;

      subtotal += itemSubtotal;
      totalGST += gstAmount;

      purchaseItems.push({
        purchaseId: purchase._id,
        productId,
        productName: product.name,
        quantity,
        buyPrice,
        subtotal: itemSubtotal,
        gst,
        gstAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total,
      });

      /* UPDATE PRODUCT STOCK AND BUYING PRICE */
      product.quantity += quantity;
      product.buyingPrice = buyPrice; // Update buying price
      await product.save({ session });

      // SOCKET: stock updated
      io.emit("stockUpdated", {
        productId: product._id,
        quantity: product.quantity,
        buyingPrice: product.buyingPrice,
      });
    }

    /* INSERT PURCHASE ITEMS */
    await PurchaseItem.insertMany(purchaseItems, { session });

    const grandTotal = subtotal + totalGST;

    purchase.subtotal = subtotal;
    purchase.gstAmount = totalGST;
    purchase.cgst = totalGST / 2;
    purchase.sgst = totalGST / 2;
    purchase.totalAmount = grandTotal;

    await purchase.save({ session });

    await session.commitTransaction();

    const populatedItems = await PurchaseItem.find({
      purchaseId: purchase._id,
    }).populate("productId");

    const populatedPurchase = {
      ...purchase.toObject(),
      items: populatedItems,
    };

    io.emit("purchaseCreated", populatedPurchase);

    res.status(201).json({
      success: true,
      message: "Purchase completed successfully",
      data: purchase,
    });
  } catch (error: any) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message || "Purchase failed",
    });
  } finally {
    session.endSession();
  }
};

// export const getPurchases = async (req: any, res: Response) => {
//   try {
//     const storeId = req.user.storeId;

//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: "Store ID is required",
//       });
//     }

//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 10;
//     const search = req.query.search || "";

//     const skip = (page - 1) * limit;

//     // Initialize with explicit type
//     let purchaseIds: string[] = [];
//     let total = 0;
//     let purchases = [];

//     // If search term exists, check if it matches any product names
//     if (search && search.toString().trim()) {
//       const searchTerm = search.toString().trim();

//       // First, find all PurchaseItems that have products matching the search term
//       const matchingItems = await PurchaseItem.find()
//         .populate({
//           path: "productId",
//           match: {
//             name: { $regex: searchTerm, $options: "i" },
//           },
//           select: "name",
//         })
//         .lean()
//         .exec();

//       // Filter out items where productId is null (no match)
//       const validItems = matchingItems.filter(
//         (item: any) => item.productId !== null,
//       );

//       // Get unique purchaseIds from matching items and convert to strings
//       purchaseIds = [
//         ...new Set(validItems.map((item: any) => item.purchaseId.toString())),
//       ];
//     }

//     // Build filter for purchases
//     const filter: any = {
//       storeId: new mongoose.Types.ObjectId(storeId),
//       isDeleted: { $ne: true },
//     };

//     // Add search conditions
//     if (search && search.toString().trim()) {
//       const searchTerm = search.toString().trim();

//       filter.$or = [
//         { supplierName: { $regex: searchTerm, $options: "i" } },
//         { paymentMethod: { $regex: searchTerm, $options: "i" } },
//       ];

//       // If we found purchases with matching products, add them to the OR condition
//       if (purchaseIds.length > 0) {
//         filter.$or.push({
//           _id: {
//             $in: purchaseIds.map((id) => new mongoose.Types.ObjectId(id)),
//           },
//         });
//       }

//       // Also search numeric fields if search is a number
//       const searchNumber = parseFloat(searchTerm);
//       if (!isNaN(searchNumber)) {
//         filter.$or.push(
//           { subtotal: searchNumber },
//           { gstAmount: searchNumber },
//           { totalAmount: searchNumber },
//         );
//       }
//     }

//     // Get total count
//     total = await Purchase.countDocuments(filter);

//     // Fetch purchases
//     purchases = await Purchase.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean()
//       .exec();

//     console.log(`Found ${purchases.length} purchases`);

//     // Fetch items for each purchase
//     const purchasesWithItems = await Promise.all(
//       purchases.map(async (purchase: any) => {
//         try {
//           const items = await PurchaseItem.find({
//             purchaseId: purchase._id,
//           })
//             .populate({
//               path: "productId",
//               select: "name price buyingPrice",
//             })
//             .lean()
//             .exec();

//           return {
//             ...purchase,
//             items: items || [],
//           };
//         } catch (itemError) {
//           console.error(
//             `Error fetching items for purchase ${purchase._id}:`,
//             itemError,
//           );
//           return {
//             ...purchase,
//             items: [],
//           };
//         }
//       }),
//     );

//     const totalPages = Math.ceil(total / limit);

//     res.status(200).json({
//       success: true,
//       data: purchasesWithItems,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getPurchases:", error);
//     console.error("Error stack:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch purchases",
//       error: process.env.NODE_ENV === "development" ? error : undefined,
//     });
//   }
// };

export const getPurchases = async (req: any, res: Response) => {
  try {
    const storeId = req.user.storeId;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const { type, startDate, endDate } = req.query as {
      type?: string;
      startDate?: string;
      endDate?: string;
    };

    const skip = (page - 1) * limit;

    let purchaseIds: string[] = [];

    // ================= SEARCH BY PRODUCT =================
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();

      const matchingItems = await PurchaseItem.find()
        .populate({
          path: "productId",
          match: {
            name: { $regex: searchTerm, $options: "i" },
          },
          select: "name",
        })
        .lean();

      const validItems = matchingItems.filter(
        (item: any) => item.productId !== null,
      );

      purchaseIds = [
        ...new Set(validItems.map((item: any) => item.purchaseId.toString())),
      ];
    }

    // ================= BASE FILTER =================
    const filter: any = {
      storeId: new mongoose.Types.ObjectId(storeId),
      isDeleted: { $ne: true },
    };

    const now = new Date();

    // ================= DATE FILTER =================

    if (type === "daily") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start, $lte: now };
    }

    if (type === "weekly") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      filter.createdAt = { $gte: start, $lte: now };
    }

    if (type === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.createdAt = { $gte: start, $lte: now };
    }

    if (type === "yearly") {
      const start = new Date(now.getFullYear(), 0, 1);
      filter.createdAt = { $gte: start, $lte: now };
    }

    // ✅ Custom date override
    const start = typeof startDate === "string" ? new Date(startDate) : null;
    const end = typeof endDate === "string" ? new Date(endDate) : null;

    if (start && end) {
      filter.createdAt = { $gte: start, $lte: end };
    }

    // ================= SEARCH FILTER =================
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();

      filter.$or = [
        { supplierName: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
      ];

      if (purchaseIds.length > 0) {
        filter.$or.push({
          _id: {
            $in: purchaseIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        });
      }

      const searchNumber = parseFloat(searchTerm);
      if (!isNaN(searchNumber)) {
        filter.$or.push(
          { subtotal: searchNumber },
          { gstAmount: searchNumber },
          { totalAmount: searchNumber },
        );
      }
    }

    // ================= COUNT =================
    const total = await Purchase.countDocuments(filter);

    // ================= FETCH =================
    const purchases = await Purchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ================= ITEMS =================
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase: any) => {
        const items = await PurchaseItem.find({
          purchaseId: purchase._id,
        })
          .populate({
            path: "productId",
            select: "name price buyingPrice",
          })
          .lean();

        return {
          ...purchase,
          items: items || [],
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: purchasesWithItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in getPurchases:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
    });
  }
};
export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    const items = await PurchaseItem.find({
      purchaseId: id,
      isDeleted: { $ne: true },
    }).populate("productId");

    res.status(200).json({
      success: true,
      data: {
        ...purchase.toObject(),
        items,
      },
    });
  } catch (error) {
    console.error("Error in getPurchaseById:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase",
    });
  }
};

export const updatePurchase = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const purchaseId = req.params.id as string;
    const purchaseObjectId = new mongoose.Types.ObjectId(purchaseId);
    const { supplierName, paymentMethod, items } = req.body;

    if (!items || items.length === 0) {
      throw new Error("Purchase items required");
    }

    const purchase = await Purchase.findById(purchaseId).session(session);

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    /* 1️⃣ GET OLD ITEMS */
    const oldItems = await PurchaseItem.find({
      purchaseId: purchaseObjectId,
    }).session(session);

    /* 2️⃣ RESTORE STOCK (subtract old quantities) */
    for (const item of oldItems) {
      const product = await Product.findById(item.productId).session(session);
      if (product) {
        product.quantity -= item.quantity;
        await product.save({ session });

        // SOCKET: stock updated
        io.emit("stockUpdated", {
          productId: product._id,
          quantity: product.quantity,
        });
      }
    }

    /* 3️⃣ DELETE OLD ITEMS */
    await PurchaseItem.deleteMany({ purchaseId: purchaseObjectId }).session(
      session,
    );

    let subtotal = 0;
    let totalGST = 0;
    const newItems: any[] = [];

    /* 4️⃣ ADD NEW ITEMS */
    for (const item of items) {
      const { productId, quantity, buyPrice } = item;

      const product = await Product.findById(productId).session(session);

      if (!product) throw new Error("Product not found");

      const gst = product.gst || 0;

      const itemSubtotal = buyPrice * quantity;
      const gstAmount = (itemSubtotal * gst) / 100;

      subtotal += itemSubtotal;
      totalGST += gstAmount;

      newItems.push({
        purchaseId,
        productId,
        productName: product.name,
        quantity,
        buyPrice,
        subtotal: itemSubtotal,
        gst,
        gstAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total: itemSubtotal + gstAmount,
      });

      /* UPDATE STOCK AND BUYING PRICE */
      product.quantity += quantity;
      product.buyingPrice = buyPrice;
      await product.save({ session });

      // SOCKET: stock updated
      io.emit("stockUpdated", {
        productId: product._id,
        quantity: product.quantity,
        buyingPrice: product.buyingPrice,
      });
    }

    /* 5️⃣ INSERT NEW ITEMS */
    await PurchaseItem.insertMany(newItems, { session });

    /* 6️⃣ UPDATE PURCHASE */
    purchase.supplierName = supplierName;
    purchase.paymentMethod = paymentMethod;
    purchase.subtotal = subtotal;
    purchase.gstAmount = totalGST;
    purchase.cgst = totalGST / 2;
    purchase.sgst = totalGST / 2;
    purchase.totalAmount = subtotal + totalGST;

    await purchase.save({ session });

    await session.commitTransaction();

    // SOCKET: purchase updated
    io.emit("purchaseUpdated", purchase);

    res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: purchase,
    });
  } catch (error: any) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message || "Update failed",
    });
  } finally {
    session.endSession();
  }
};

export const deletePurchase = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const purchaseId = req.params.id as string;

    const purchase = await Purchase.findById(purchaseId).session(session);

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.isDeleted) {
      throw new Error("Purchase already deleted");
    }

    /* 1️⃣ GET ITEMS */
    const items = await PurchaseItem.find({ purchaseId }).session(session);

    /* 2️⃣ RESTORE STOCK (subtract quantities since this was an inbound purchase) */
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (product) {
        product.quantity -= item.quantity;
        await product.save({ session });

        // SOCKET: stock updated
        io.emit("stockUpdated", {
          productId: product._id,
          quantity: product.quantity,
        });
      }
    }

    /* 3️⃣ MARK AS DELETED */
    purchase.isDeleted = true;
    purchase.deletedAt = new Date();

    await purchase.save({ session });

    await session.commitTransaction();

    // SOCKET: purchase deleted
    io.emit("purchaseDeleted", { purchaseId });

    res.status(200).json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (error: any) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message || "Delete failed",
    });
  } finally {
    session.endSession();
  }
};

export const getPurchaseReport = async (req: Request, res: Response) => {
  try {
    const storeId = (req as any).user.storeId;
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }
    const { type, startDate, endDate } = req.query as {
      type?: string;
      startDate?: string;
      endDate?: string;
    };

    let match: any = {
      storeId: new mongoose.Types.ObjectId(storeId),
      isDeleted: { $ne: true },
    };

    const now = new Date();

    // 📅 Date Filters
    if (type === "daily") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      match.createdAt = { $gte: start, $lte: now };
    }

    if (type === "weekly") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      match.createdAt = { $gte: start, $lte: now };
    }

    if (type === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      match.createdAt = { $gte: start, $lte: now };
    }

    if (type === "yearly") {
      const start = new Date(now.getFullYear(), 0, 1);
      match.createdAt = { $gte: start, $lte: now };
    }
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 📊 SUMMARY (cards)
    const summary = await Purchase.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: "$totalAmount" },
          totalGST: { $sum: "$gstAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // 📈 CHART GROUPING
    let groupId: any = {};

    if (type === "daily") {
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else if (type === "weekly" || type === "monthly") {
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else if (type === "yearly") {
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    } else {
      // default (custom range)
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    }

    const chart = await Purchase.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          total: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    // 📦 Purchase list (like sales list)
    const purchases = await Purchase.find(match).sort({ createdAt: -1 });

    // 🎯 FORMAT FOR FRONTEND
    const formattedChart = chart.map((item) => {
      const { year, month, day } = item._id;

      return {
        date: day
          ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          : `${year}-${String(month).padStart(2, "0")}`,
        total: item.total,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] || {
          totalPurchase: 0,
          totalGST: 0,
          totalOrders: 0,
        },
        chart: formattedChart,
        purchases,
      },
    });
  } catch (error) {
    console.error("Purchase Report Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate purchase report",
    });
  }
};
