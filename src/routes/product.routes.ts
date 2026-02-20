import express from "express";
import Product from "../models/product.model.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// Create Product
router.post("/", protect, authorize("admin"), async (req: any, res) => {
  try {
    const { name, price, stock, category, gstRate, hsnCode } = req.body;

    const product = await Product.create({
      name,
      price,
      stock,
      category,
      gstRate,
      hsnCode,
      storeId: req.user.storeId,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error });
  }
});

// Get All Products (Only Store's Products)
router.get("/", protect, async (req: any, res) => {
  try {
    const products = await Product.find({
      storeId: req.user.storeId,
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

export default router;
