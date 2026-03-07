import express from "express";
import type { Request, Response } from "express";
import Store from "../models/store.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, async (req: Request, res: Response) => {
  try {
    const {
      name,
      ownerName,
      mobile,
      email,
      storeType,
      address,
      isGSTRegistered,
      gstNumber,
    } = req.body;

    if (!name || !ownerName || !mobile || !email) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const allowedTypes = ["cloth", "food", "electrical", "other"];

    if (storeType && !allowedTypes.includes(storeType)) {
      return res.status(400).json({
        message: "Invalid store type",
      });
    }

    if (isGSTRegistered && !gstNumber) {
      return res.status(400).json({
        message: "GST number is required if GST is registered",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingStore = await Store.findOne({ email: normalizedEmail });

    if (existingStore) {
      return res.status(409).json({ message: "Store already exists" });
    }

    const store = await Store.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      mobile: mobile.trim(),
      email: normalizedEmail,
      storeType,
      address: address?.trim(),
      isGSTRegistered,
      gstNumber: isGSTRegistered ? gstNumber : undefined,
    });

    res.status(201).json({
      message: "Store created successfully",
      store,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating store",
    });
  }
});

router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const stores = await Store.find().sort({ createdAt: -1 });

    res.status(200).json(stores);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching stores",
    });
  }
});

router.get("/:id", protect, async (req: Request, res: Response) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        message: "Store not found",
      });
    }

    res.status(200).json(store);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching store",
    });
  }
});

router.put("/:id", protect, async (req: Request, res: Response) => {
  try {
    const {
      name,
      ownerName,
      mobile,
      email,
      isGSTRegistered,
      gstNumber,
      storeType,
      isActive,
    } = req.body;

    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        message: "Store not found",
      });
    }

    store.name = name ?? store.name;
    store.ownerName = ownerName ?? store.ownerName;
    store.mobile = mobile ?? store.mobile;
    store.email = email ?? store.email;
    store.isGSTRegistered = isGSTRegistered ?? store.isGSTRegistered;
    store.gstNumber = gstNumber ?? store.gstNumber;
    store.storeType = storeType ?? store.storeType;
    store.isActive = isActive ?? store.isActive;

    const updatedStore = await store.save();

    res.status(200).json(updatedStore);
  } catch (error) {
    res.status(500).json({
      message: "Error updating store",
    });
  }
});

export default router;
