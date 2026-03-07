import type { Request, Response } from "express";
import mongoose from "mongoose";

import Sale from "../models/sale.model.js";
import SaleItem from "../models/saleItem.model.js";
import Product from "../models/product.model.js";
import { generateInvoiceNumber } from "../utils/invoice.js";

export const createSale = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { customerName, paymentMethod, items } = req.body;
    const storeId = (req as any).user.storeId;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Sale items required",
      });
    }

    const invoiceNumber = generateInvoiceNumber();

    const sale = new Sale({
      invoiceNumber,
      customerName,
      paymentMethod,
      storeId,
      totalAmount: 0,
    });

    await sale.save({ session });

    let totalAmount = 0;
    const saleItems: any[] = [];

    for (const item of items) {
      const { productId, quantity } = item;

      const product = await Product.findById(productId).session(session);

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.quantity < quantity) {
        throw new Error(`${product.name} is out of stock`);
      }

      const price = product.sellingPrice || 0;
      const total = price * quantity;

      totalAmount += total;

      saleItems.push({
        saleId: sale._id,
        productId,
        quantity,
        price,
        total,
      });

      product.quantity -= quantity;
      await product.save({ session });
    }

    await SaleItem.insertMany(saleItems, { session });

    sale.totalAmount = totalAmount;
    await sale.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Sale completed",
      sale,
    });
  } catch (error: any) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const getSales = async (req: any, res: Response) => {
  try {
    const sales = await Sale.find({
      storeId: req.user.storeId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sales",
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

    const items = await SaleItem.find({ saleId: id }).populate("productId");

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
