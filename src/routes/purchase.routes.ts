import express from "express";
import {
  createPurchase,
  getPurchaseById,
  getPurchases,
  updatePurchase,
  deletePurchase,
  getPurchaseReport,
} from "../controllers/purchase.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createPurchase);
router.get("/", protect, getPurchases);
router.get("/details/:id", protect, getPurchaseById);
router.put("/:id", protect, updatePurchase);
router.delete("/:id", protect, deletePurchase);
router.get("/report", protect, getPurchaseReport);

export default router;
