import express from "express";
import {
  createSale,
  getSales,
  getSaleById,
  updateSale,
  deleteSale,
  getSalesReport,
} from "../controllers/sale.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createSale);
router.get("/", protect, getSales);
router.get("/details/:id", protect, getSaleById);
router.put("/:id", protect, updateSale);
router.delete("/:id", protect, deleteSale);
router.get("/saleReport", protect, getSalesReport);

export default router;
