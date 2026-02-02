import { Response } from "express";
import { AuthRequest } from "../types";
import { BeneficiaryService } from "../services/beneficiaryService";

export class BeneficiaryController {
  /**
   * Create a new beneficiary list
   */
  static async createBeneficiary(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { name, description, chain, network, recipients } = req.body;

      if (
        !name ||
        !chain ||
        !network ||
        !recipients ||
        !Array.isArray(recipients)
      ) {
        res.status(400).json({
          error: "Missing required fields: name, chain, network, recipients",
        });
        return;
      }

      const beneficiary = await BeneficiaryService.createBeneficiary(
        req.user.id,
        name,
        recipients,
        chain,
        network,
        description,
      );

      res.status(201).json({
        message: "Beneficiary created successfully",
        beneficiary,
      });
    } catch (error) {
      console.error("Create beneficiary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get all beneficiaries for the authenticated user
   */
  static async getBeneficiaries(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const beneficiaries = await BeneficiaryService.getBeneficiaries(
        req.user.id,
      );

      res.json({
        message: "Beneficiaries retrieved successfully",
        beneficiaries,
      });
    } catch (error) {
      console.error("Get beneficiaries error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get a single beneficiary by ID
   */
  static async getBeneficiary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      let { id } = req.params;
      if (Array.isArray(id)) id = id[0];
      const beneficiary = await BeneficiaryService.getBeneficiary(
        id,
        req.user.id,
      );

      if (!beneficiary) {
        res.status(404).json({ error: "Beneficiary not found" });
        return;
      }

      res.json({ beneficiary });
    } catch (error) {
      console.error("Get beneficiary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update a beneficiary
   */
  static async updateBeneficiary(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      let { id } = req.params;
      if (Array.isArray(id)) id = id[0];
      const { name, description, recipients } = req.body;

      const beneficiary = await BeneficiaryService.updateBeneficiary(
        id,
        req.user.id,
        { name, description, recipients },
      );

      if (!beneficiary) {
        res.status(404).json({ error: "Beneficiary not found" });
        return;
      }

      res.json({
        message: "Beneficiary updated successfully",
        beneficiary,
      });
    } catch (error) {
      console.error("Update beneficiary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Delete a beneficiary
   */
  static async deleteBeneficiary(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      let { id } = req.params;
      if (Array.isArray(id)) id = id[0];
      const deleted = await BeneficiaryService.deleteBeneficiary(
        id,
        req.user.id,
      );

      if (!deleted) {
        res.status(404).json({ error: "Beneficiary not found" });
        return;
      }

      res.json({ message: "Beneficiary deleted successfully" });
    } catch (error) {
      console.error("Delete beneficiary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
