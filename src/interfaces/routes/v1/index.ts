import express from "express";
import healthRoutes from "./healthRoutes";

const router = express.Router();

router.use("/health", healthRoutes);

export default router;
