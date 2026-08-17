import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { apiRouter as churchCourseRouter } from "../church/routes.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(churchCourseRouter);

export default router;
