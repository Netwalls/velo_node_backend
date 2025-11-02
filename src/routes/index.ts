import { Router } from "express";
import airtimeRoutes from "./airtime";

const router = Router();

router.use("/airtime", airtimeRoutes);

export default router;
