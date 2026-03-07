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

    const sales = await Sale.find({
      storeId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const salesWithItems = await Promise.all(
      sales.map(async (sale: any) => {
        const items = await SaleItem.find({
          saleId: sale._id,
        })
          .populate("productId", "name")
          .lean();

        return {
          ...sale,
          items,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: salesWithItems,
    });
  } catch (error) {
    console.error(error);

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
