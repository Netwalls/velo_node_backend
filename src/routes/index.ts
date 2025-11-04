// src/routes/index.ts
import { Router } from "express";
import airtimeRoutes from "./airtime";
import dataRoutes from "./data";
import electricityRoutes from "./electricity";

const router = Router();

router.use("/airtime", airtimeRoutes);
router.use("/data", dataRoutes);
router.use("/electricity", electricityRoutes);

export default router;