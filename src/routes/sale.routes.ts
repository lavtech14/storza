import express from "express";
import {
  createSale,
  getSales,
  getSaleById,
} from "../controllers/sale.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createSale);
router.get("/", protect, getSales);
router.get("/details/:id", protect, getSaleById);

export default router;
