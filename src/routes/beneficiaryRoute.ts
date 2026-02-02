import { Router } from "express";
import { BeneficiaryController } from "../controllers/beneficiaryController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All beneficiary routes require authentication
router.use(authMiddleware);

// Create a new beneficiary list
router.post("/", BeneficiaryController.createBeneficiary);

// Get all beneficiaries for the user
router.get("/", BeneficiaryController.getBeneficiaries);

// Get a single beneficiary
router.get("/:id", BeneficiaryController.getBeneficiary);

// Update a beneficiary
router.put("/:id", BeneficiaryController.updateBeneficiary);

// Delete a beneficiary
router.delete("/:id", BeneficiaryController.deleteBeneficiary);

export default router;
