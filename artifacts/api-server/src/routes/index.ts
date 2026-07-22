import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parcelsRouter from "./parcels";
import inspectionsRouter from "./inspections";
import citationsRouter from "./citations";
import residentRouter from "./resident";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(parcelsRouter);
router.use(inspectionsRouter);
router.use(citationsRouter);
router.use(residentRouter);
router.use(dashboardRouter);

export default router;
