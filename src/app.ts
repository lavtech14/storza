import express from "express";
import cors from "cors";
import storeRoutes from "./routes/store.routes.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import path from "path";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://storza-client.vercel.app"],
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Storza API Running 🚀");
});

app.use("/api/stores", storeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);

app.use(express.static(path.resolve("dist")));

/* React Router fallback */
app.use((req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});

export default app;
