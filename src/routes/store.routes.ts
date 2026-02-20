import express from "express";
import type { Request, Response } from "express";
import Store from "../models/store.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, async (req: Request, res: Response) => {
  try {
    const { name, ownerName, mobile, email, isGSTRegistered, gstNumber } =
      req.body;

    if (!name || !ownerName || !mobile || !email) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (isGSTRegistered && !gstNumber) {
      return res.status(400).json({
        message: "GST number is required if GST is registered",
      });
    }

    const existingStore = await Store.findOne({ email });
    if (existingStore) {
      return res.status(400).json({ message: "Store already exists" });
    }

    const store = await Store.create({
      name,
      ownerName,
      mobile,
      email,
      isGSTRegistered,
      gstNumber,
    });

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: "Error creating store" });
  }
});

export default router;
