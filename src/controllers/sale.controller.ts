import type { Request, Response } from "express";
import mongoose from "mongoose";

import Sale from "../models/sale.model.js";
import SaleItem from "../models/saleItem.model.js";
import Product from "../models/product.model.js";
import { generateInvoiceNumber } from "../utils/invoice.js";
import { io } from "../server.js";

export const createSale = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { customerName, paymentMethod, items } = req.body;
    const storeId = (req as any).user.storeId;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sale items required",
      });
    }

    const invoiceNumber = generateInvoiceNumber();

    /* CREATE SALE */
    const sale = new Sale({
      invoiceNumber,
      customerName,
      paymentMethod,
      storeId,
      subtotal: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      totalAmount: 0,
    });

    await sale.save({ session });

    let subtotal = 0;
    let totalGST = 0;

    const saleItems: any[] = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || quantity <= 0) {
        throw new Error("Invalid sale item");
      }

      const product = await Product.findById(productId).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.quantity < quantity) {
        throw new Error(`${product.name} is out of stock`);
      }

      const price = product.sellingPrice || 0;
      const gst = product.gst || 0;

      const itemSubtotal = price * quantity;
      const gstAmount = (itemSubtotal * gst) / 100;
      const total = itemSubtotal + gstAmount;

      subtotal += itemSubtotal;
      totalGST += gstAmount;

      saleItems.push({
        saleId: sale._id,
        productId,
        productName: product.name,
        quantity,
        price,
        subtotal: itemSubtotal,
        gst,
        gstAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total,
      });

      /* REDUCE PRODUCT STOCK */
      product.quantity -= quantity;
      await product.save({ session });
    }

    /* INSERT SALE ITEMS */
    await SaleItem.insertMany(saleItems, { session });

    const grandTotal = subtotal + totalGST;

    sale.subtotal = subtotal;
    sale.gstAmount = totalGST;
    sale.cgst = totalGST / 2;
    sale.sgst = totalGST / 2;
    sale.totalAmount = grandTotal;

    await sale.save({ session });

    await session.commitTransaction();
    const populatedItems = await SaleItem.find({ saleId: sale._id }).populate(
      "productId",
    );

    const populatedSale = {
      ...sale.toObject(),
      items: populatedItems,
    };

    io.emit("saleCreated", populatedSale);
    res.status(201).json({
      success: true,
      message: "Sale completed successfully",
      data: sale,
    });
  } catch (error: any) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message || "Sale failed",
    });
  } finally {
    session.endSession();
  }
};

export const getSales = async (req: any, res: Response) => {
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

    // 🆕 NEW FILTER PARAMS
    const { type, startDate, endDate } = req.query;

    const skip = (page - 1) * limit;

    let saleIds: string[] = [];
    let total = 0;
    let sales = [];

    // 🔍 SEARCH (unchanged)
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();

      const matchingItems = await SaleItem.find()
        .populate({
          path: "productId",
          match: {
            name: { $regex: searchTerm, $options: "i" },
          },
          select: "name",
        })
        .lean()
        .exec();

      const validItems = matchingItems.filter(
        (item: any) => item.productId !== null,
      );

      saleIds = [
        ...new Set(validItems.map((item: any) => item.saleId.toString())),
      ];
    }

    // 🧠 BASE FILTER
    const filter: any = {
      storeId: new mongoose.Types.ObjectId(storeId),
      isDeleted: { $ne: true },
    };

    // 🔍 SEARCH CONDITIONS
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();

      filter.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
      ];

      if (saleIds.length > 0) {
        filter.$or.push({
          _id: {
            $in: saleIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        });
      }
    }

    // 🆕 📅 DATE FILTER (IMPORTANT)
    const now = new Date();

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

    // 🧠 CUSTOM DATE (override all)
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 📊 COUNT
    total = await Sale.countDocuments(filter);

    // 📦 FETCH SALES
    sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // 📦 FETCH ITEMS
    const salesWithItems = await Promise.all(
      sales.map(async (sale: any) => {
        try {
          const items = await SaleItem.find({
            saleId: sale._id,
          })
            .populate({
              path: "productId",
              select: "name price",
            })
            .lean()
            .exec();

          return {
            ...sale,
            items: items || [],
          };
        } catch (itemError) {
          console.error(
            `Error fetching items for sale ${sale._id}:`,
            itemError,
          );
          return {
            ...sale,
            items: [],
          };
        }
      }),
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: salesWithItems,
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
    console.error("Error in getSales:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
export const getSaleById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    const items = await SaleItem.find({
      saleId: id,
      isDeleted: { $ne: true },
    }).populate("productId");

    res.status(200).json({
      sale,
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sale",
    });
  }
};
export const updateSale = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const saleId = req.params.id as string;
    const saleObjectId = new mongoose.Types.ObjectId(saleId);
    const { customerName, paymentMethod, items } = req.body;

    if (!items || items.length === 0) {
      throw new Error("Sale items required");
    }

    const sale = await Sale.findById(saleId).session(session);

    if (!sale) {
      throw new Error("Sale not found");
    }

    /* 1️⃣ GET OLD ITEMS */
    const oldItems = await SaleItem.find({ saleId: saleObjectId }).session(
      session,
    );

    /* 2️⃣ RESTORE STOCK */
    for (const item of oldItems) {
      const product = await Product.findById(item.productId).session(session);
      if (product) {
        product.quantity += item.quantity;
        await product.save({ session });
      }
    }

    /* 3️⃣ DELETE OLD ITEMS */
    await SaleItem.deleteMany({ saleId: saleObjectId }).session(session);

    let subtotal = 0;
    let totalGST = 0;
    const newItems: any[] = [];

    /* 4️⃣ ADD NEW ITEMS */
    for (const item of items) {
      const { productId, quantity } = item;

      const product = await Product.findById(productId).session(session);

      if (!product) throw new Error("Product not found");

      if (product.quantity < quantity) {
        throw new Error(`${product.name} is out of stock`);
      }

      const price = product.sellingPrice || 0;
      const gst = product.gst || 0;

      const itemSubtotal = price * quantity;
      const gstAmount = (itemSubtotal * gst) / 100;

      subtotal += itemSubtotal;
      totalGST += gstAmount;

      newItems.push({
        saleId,
        productId,
        productName: product.name,
        quantity,
        price,
        subtotal: itemSubtotal,
        gst,
        gstAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total: itemSubtotal + gstAmount,
      });

      /* REDUCE STOCK AGAIN */
      product.quantity -= quantity;
      await product.save({ session });
    }

    /* 5️⃣ INSERT NEW ITEMS */
    await SaleItem.insertMany(newItems, { session });

    /* 6️⃣ UPDATE SALE */
    sale.customerName = customerName;
    sale.paymentMethod = paymentMethod;
    sale.subtotal = subtotal;
    sale.gstAmount = totalGST;
    sale.cgst = totalGST / 2;
    sale.sgst = totalGST / 2;
    sale.totalAmount = subtotal + totalGST;

    await sale.save({ session });

    await session.commitTransaction();
    io.emit("saleUpdated", sale);
    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      data: sale,
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
export const deleteSale = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const saleId = req.params.id as string;

    const sale = await Sale.findById(saleId).session(session);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.isDeleted) {
      throw new Error("Sale already deleted");
    }

    /* 1️⃣ GET ITEMS */
    const items = await SaleItem.find({ saleId }).session(session);

    /* 2️⃣ RESTORE STOCK */
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (product) {
        product.quantity += item.quantity;
        await product.save({ session });

        // SOCKET: stock update
        io.emit("stockUpdated", {
          productId: product._id,
          quantity: product.quantity,
        });
      }
    }

    /* 3️⃣ MARK AS DELETED */
    sale.isDeleted = true;
    sale.deletedAt = new Date();

    await sale.save({ session });

    await session.commitTransaction();

    // SOCKET: sale deleted
    io.emit("saleDeleted", { saleId });

    res.status(200).json({
      success: true,
      message: "Sale deleted successfully",
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

export const getSalesReport = async (req: any, res: Response) => {
  try {
    const storeId = req.user.storeId;
    const { type, startDate, endDate } = req.query;

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

    // 🧠 Custom Range (override)
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 📊 SUMMARY (cards)
    const summary = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
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
    } else if (type === "monthly" || type === "weekly") {
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }, // good for last 7 days
      };
    } else if (type === "yearly") {
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    } else {
      // default (custom range → daily)
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    }

    const chart = await Sale.aggregate([
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
    const sales = await Sale.find(match)
      .populate("storeId", "name")
      .sort({ createdAt: -1 });

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
          totalSales: 0,
          totalGST: 0,
          totalOrders: 0,
        },
        chart: formattedChart,
        sales,
      },
    });
  } catch (error) {
    console.error("Report Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
};
