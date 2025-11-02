// src/routes/index.ts
import { Router } from "express";
import airtimeRoutes from "./airtime";
import dataRoutes from "./data";

const router = Router();

router.use("/airtime", airtimeRoutes);
router.use("/data", dataRoutes);

export default router;