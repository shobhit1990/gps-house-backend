import { Router } from "express";
import { container } from "tsyringe";
import { RaiseTicketController } from "../../controllers/v1/RaiseTicketController";

const router = Router();
const controller = container.resolve(RaiseTicketController);

router.get("/getAll", controller.getRaiseTickets);
router.get("/getById/:externalId", controller.getRaiseTicketById);
router.post("/", controller.createRaiseTicket);
router.put("/update/:externalId", controller.updateRaiseTicket);
router.delete("/delete/:externalId", controller.deleteRaiseTicket);

export default router;
