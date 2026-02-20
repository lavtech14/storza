import type { Request, Response } from "express";
import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";

export const createSale = async (req: any, res: Response) => {
  try {
    const { items, paymentMode } = req.body;

    let subtotal = 0;
    let totalTax = 0;

    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      const store = await Store.findById(req.user.storeId);

      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const itemTotal = product.price * item.quantity;
      let taxAmount = 0;
      let cgst = 0;
      let sgst = 0;
      if (store.isGSTRegistered) {
        taxAmount = (itemTotal * product.gstRate) / 100;
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }

      subtotal += itemTotal;
      totalTax += taxAmount;

      saleItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        gstRate: product.gstRate,
        cgst,
        sgst,
        igst: 0,
        total: itemTotal + taxAmount,
      });

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();
    }

    const grandTotal = subtotal + totalTax;

    const sale = await Sale.create({
      items: saleItems,
      subtotal,
      totalTax,
      grandTotal,
      paymentMode,
      storeId: req.user.storeId,
    });

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: "Error creating sale", error });
  }
};

export const getSalesSummary = async (req: any, res: Response) => {
  try {
    const storeId = req.user.storeId;

    const sales = await Sale.find({ storeId });

    const totalSales = sales.reduce((acc, sale) => acc + sale.grandTotal, 0);
    const totalTax = sales.reduce((acc, sale) => acc + sale.totalTax, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = sales
      .filter((sale) => sale.createdAt >= today)
      .reduce((acc, sale) => acc + sale.grandTotal, 0);

    const paymentBreakdown = {
      cash: 0,
      upi: 0,
      card: 0,
    };

    sales.forEach((sale) => {
      paymentBreakdown[sale.paymentMode] += sale.grandTotal;
    });

    res.json({
      totalSales,
      totalTax,
      todaySales,
      paymentBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching summary" });
  }
};
