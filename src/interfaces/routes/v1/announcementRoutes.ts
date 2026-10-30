import { Router } from "express";
import { container } from "tsyringe";
import { AnnouncementController } from "../../controllers/v1/AnnouncementController";
import { imageUpload } from "../../../utils/fileUpload";

const router = Router();
const controller = container.resolve(AnnouncementController);

router.get("/getAll", controller.getAnnouncements);
router.get("/getById/:externalId", controller.getAnnouncementById);
router.post(
  "/",
  imageUpload.single("messageImage"),
  controller.createAnnouncement,
);
router.put(
  "/update/:externalId",
  imageUpload.single("messageImage"),
  controller.updateAnnouncement,
);
router.delete("/delete/:externalId", controller.deleteAnnouncement);

export default router;
