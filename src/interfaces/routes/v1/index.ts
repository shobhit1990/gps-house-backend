import express from "express";
import healthRoutes from "./healthRoutes";
import ownerRoutes from "./ownerRoutes";
import clientRoutes from "./clientRoutes";
import menuRoutes from "./menuRoutes";
import transporterRouter from "./transporterRoutes";
import addVehicleRoutes from "./addVehicleRoutes";
import paymentDetailsRoutes from "./paymentDetailsRoutes";

import masterRoutes from "./masterRoutes";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/owner", ownerRoutes);
router.use("/client", clientRoutes);
router.use("/menu", menuRoutes);
router.use("/transporter", transporterRouter);
router.use("/vehicle", addVehicleRoutes);
router.use("/paymentDetails", paymentDetailsRoutes);

//master
router.use("/master", masterRoutes);

export default router;
