import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createSale } from "../controllers/sale.controller.js";
import { getSalesSummary } from "../controllers/sale.controller.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("admin", "staff"), createSale);
router.get("/summary", protect, authorize("admin"), getSalesSummary);

export default router;
