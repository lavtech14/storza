import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createProduct);

router.get("/", protect, getProducts);

router.put("/:id", protect, updateProduct);

router.delete("/:id", protect, deleteProduct);

export default router;
