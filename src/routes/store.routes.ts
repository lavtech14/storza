import express from "express";
import Store from "../models/store.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: "Error creating store", error });
  }
});

export default router;
