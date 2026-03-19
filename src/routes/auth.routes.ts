import express from "express";
import {
  register,
  login,
  getUsers,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/", getUsers);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);

export default router;
