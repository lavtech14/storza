import type { Request, Response } from "express";
import Product from "../models/product.model.js";
import { io } from "../server.js";

/* ---------------- CREATE PRODUCT ---------------- */

export const createProduct = async (req: Request, res: Response) => {
  try {
    const storeId = (req as any).user.storeId;

    const product = await Product.create({
      ...req.body,
      storeId,
    });
    io.emit("productCreated", product);
    if (product.quantity <= (product.minStockAlert ?? 5)) {
      io.emit("lowStock", product);
    }
    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product" });
  }
};

/* ---------------- GET PRODUCTS ---------------- */
export const getProducts = async (req: any, res: Response) => {
  try {
    const storeId = req.user.storeId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";

    const skip = (page - 1) * limit;

    let searchFilter: any = { storeId };

    if (search) {
      const isNumber = !isNaN(Number(search));

      const orConditions: any[] = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { hsnCode: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];

      // ✅ Numeric search
      if (isNumber) {
        const num = Number(search);

        orConditions.push(
          { sellingPrice: num },
          { buyingPrice: num },
          { discountPrice: num },
          { quantity: num },
          { minStockAlert: num },

          // ✅ FIXED GST SEARCH
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$gst" },
                regex: search,
                options: "i",
              },
            },
          },
        );
      }

      // ✅ Special keyword: LOW STOCK
      if (
        search.toLowerCase() === "low" ||
        search.toLowerCase() === "low stock"
      ) {
        orConditions.push({
          $expr: { $lte: ["$quantity", "$minStockAlert"] },
        });
      }

      searchFilter.$or = orConditions;
    }

    const products = await Product.find(searchFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(searchFilter);

    res.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    // ✅ Now TypeScript knows product is NOT null

    io.emit("productUpdated", product);

    // 🔥 LOW STOCK CHECK
    if (product.quantity <= (product.minStockAlert ?? 5)) {
      io.emit("lowStock", product);
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
    io.emit("productDeleted", id);
    res.json({
      message: "Product deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting product" });
  }
};
