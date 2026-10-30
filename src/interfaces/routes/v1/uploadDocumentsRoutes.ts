import { Router } from "express";
import { container } from "tsyringe";
import { UploadDocumentsController } from "../../controllers/v1/UploadDocumentsController";
import { upload } from "../../../utils/fileUpload";

const router = Router();
const controller = container.resolve(UploadDocumentsController);

router.get("/getAll", controller.getUploadDocuments);
router.get("/getById/:externalId", controller.getUploadDocumentById);
router.post(
  "/",
  upload.array("uploadDocument", 10),
  controller.createUploadDocument,
);
router.put(
  "/update/:externalId",
  upload.array("uploadDocument", 10),
  controller.updateUploadDocument,
);
router.delete("/delete/:externalId", controller.deleteUploadDocument);

export default router;
