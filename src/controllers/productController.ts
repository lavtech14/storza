import type { Request, Response } from "express";
import Product from "../models/product.model.js";

/* ---------------- CREATE PRODUCT ---------------- */

export const createProduct = async (req: Request, res: Response) => {
  try {
    const storeId = (req as any).user.storeId;

    const product = await Product.create({
      ...req.body,
      storeId,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product" });
  }
};

/* ---------------- GET PRODUCTS BY STORE ---------------- */
export const getProducts = async (req: any, res: Response) => {
  try {
    const storeId = req.user.storeId;

    const products = await Product.find({ storeId });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching products" });
  }
};

/* ---------------- UPDATE PRODUCT ---------------- */

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating product" });
  }
};

/* ---------------- DELETE PRODUCT ---------------- */

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting product" });
  }
};
