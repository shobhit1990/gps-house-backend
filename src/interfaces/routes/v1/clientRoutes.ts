import { container } from "tsyringe";
import { ClientController } from "../../controllers/v1/ClientController";
import { Router } from "express";
import { upload } from "../../../utils/fileUpload";

const router = Router();
const clientController = container.resolve(ClientController);

router.get(
    "/getAll",
    clientController.getClient
);

router.get(
    "/get-by-id/:externalId",
    clientController.getClientById
)

router.post(
    "/",
    upload.single("clientImage"),
    clientController.createClient
);

router.put(
    "/update/:externalId",
    upload.single("clientImage"),
    clientController.updateClient
)

router.delete(
    "/delete/:externalId",
    clientController.deleteClient
)
export default router;
