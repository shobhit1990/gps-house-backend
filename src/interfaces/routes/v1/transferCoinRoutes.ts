import { Router } from "express";
import { container } from "tsyringe";
import { TransferCoinController } from "../../controllers/v1/TransferCoinController";

const router = Router();
const controller = container.resolve(TransferCoinController);

router.get("/getAll", controller.getTransferCoins);
router.get("/getById/:externalId", controller.getTransferCoinById);
router.post("/", controller.createTransferCoin);
router.put("/update/:externalId", controller.updateTransferCoin);
router.delete("/delete/:externalId", controller.deleteTransferCoin);

export default router;
