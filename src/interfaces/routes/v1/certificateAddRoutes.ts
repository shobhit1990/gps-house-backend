import { Router } from "express";
import { container } from "tsyringe";
import { CertificateAddController } from "../../controllers/v1/CertificateAddController";
import { imageUpload } from "../../../utils/fileUpload";

const router = Router();
const controller = container.resolve(CertificateAddController);

const imageFields = [
  { name: "fitmentImage1", maxCount: 1 },
  { name: "fitmentImage2", maxCount: 1 },
  { name: "fitmentImage3", maxCount: 1 },
  { name: "fitmentImage4", maxCount: 1 },
  { name: "vendorLogo1", maxCount: 1 },
  { name: "vendorLogo2", maxCount: 1 },
  { name: "pancardLogo", maxCount: 1 },
  { name: "aadhaarFront", maxCount: 1 },
  { name: "aadhaarBack", maxCount: 1 },
];

router.get("/getAll", controller.getCertificateAdds);
router.get("/getById/:externalId", controller.getCertificateAddById);
router.post(
  "/",
  imageUpload.fields(imageFields),
  controller.createCertificateAdd,
);
router.put(
  "/update/:externalId",
  imageUpload.fields(imageFields),
  controller.updateCertificateAdd,
);
router.delete("/delete/:externalId", controller.deleteCertificateAdd);

export default router;
