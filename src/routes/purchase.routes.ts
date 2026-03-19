import express from "express";
import {
  createPurchase,
  getPurchaseById,
  getPurchases,
  updatePurchase,
  deletePurchase,
} from "../controllers/purchase.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createPurchase);
router.get("/", protect, getPurchases);
router.get("/details/:id", protect, getPurchaseById);
router.put("/:id", protect, updatePurchase);
router.delete("/:id", protect, deletePurchase);

export default router;
