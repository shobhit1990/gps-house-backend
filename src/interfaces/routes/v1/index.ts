import express from "express";
import healthRoutes from "./healthRoutes";
import ownerRoutes from "./ownerRoutes";
import clientRoutes from "./clientRoutes";
import menuRoutes from "./menuRoutes";
import transporterRouter from "./transporterRoutes";
import addVehicleRoutes from "./addVehicleRoutes";
import paymentDetailsRoutes from "./paymentDetailsRoutes";
import billingDetailRoutes from "./billingDetailRoutes";
import technicianRoutes from "./technicianRoutes";
import jobsheetRoutes from "./jobsheetRoutes";
import addGroupRoutes from "./addGroupRoutes";
import userRoutes from "./userRoutes";
import deviceTypeRoutes from "./deviceTypeRoutes";
import addInventoryRoutes from "./addInventoryRoutes";
import vehicleDetailRoutes from "./vehicleDetailRoutes";
import expenseTypeRoutes from "./expenseTypeRoutes";
import expenseRoutes from "./expenseRoutes";
import deviceRoutes from "./deviceRoutes";
import uploadDocumentsRoutes from "./uploadDocumentsRoutes";
import roleRoutes from "./roleRoutes";
import alertRoutes from "./alertRoutes";
import serviceMaintenanceRoutes from "./serviceMaintenanceRoutes";
import parkedScheduleRoutes from "./parkedScheduleRoutes";
import announcementRoutes from "./announcementRoutes";
import raiseTicketRoutes from "./raiseTicketRoutes";
import vehicleConfigRoutes from "./vehicleConfigRoutes";
import certificateAddRoutes from "./certificateAddRoutes";
import transferCoinRoutes from "./transferCoinRoutes";

import masterRoutes from "./masterRoutes";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/owner", ownerRoutes);
router.use("/client", clientRoutes);
router.use("/menu", menuRoutes);
router.use("/transporter", transporterRouter);
router.use("/vehicle", addVehicleRoutes);
router.use("/paymentDetails", paymentDetailsRoutes);
router.use("/billingDetail", billingDetailRoutes);
router.use("/technician", technicianRoutes);
router.use("/jobsheet", jobsheetRoutes);
router.use("/addGroup", addGroupRoutes);
router.use("/user", userRoutes);
router.use("/deviceType", deviceTypeRoutes);
router.use("/addInventory", addInventoryRoutes);
router.use("/vehicleDetail", vehicleDetailRoutes);
router.use("/expenseType", expenseTypeRoutes);
router.use("/expense", expenseRoutes);
router.use("/device", deviceRoutes);
router.use("/uploadDocument", uploadDocumentsRoutes);
router.use("/role", roleRoutes);
router.use("/alert", alertRoutes);
router.use("/serviceMaintenance", serviceMaintenanceRoutes);
router.use("/parkedSchedule", parkedScheduleRoutes);
router.use("/announcement", announcementRoutes);
router.use("/raiseTicket", raiseTicketRoutes);
router.use("/vehicleConfig", vehicleConfigRoutes);
router.use("/certificateAdd", certificateAddRoutes);
router.use("/transferCoin", transferCoinRoutes);

//master
router.use("/master", masterRoutes);

export default router;
