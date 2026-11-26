import { Router } from "express";
import { container } from "tsyringe";
import { ContactUsController } from "../../controllers/v1/ContactUsController";

const router = Router();
const controller = container.resolve(ContactUsController);

router.get("/getAll", controller.getContactUsList);
router.get("/getById/:externalId", controller.getContactUsById);
router.post("/", controller.createContactUs);
router.put("/update/:externalId", controller.updateContactUs);
router.delete("/delete/:externalId", controller.deleteContactUs);

export default router;
