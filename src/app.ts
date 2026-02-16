import express from "express";
import cors from "cors";
import storeRoutes from "./routes/store.routes.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Storza API Running 🚀");
});

app.use("/api/stores", storeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

export default app;
