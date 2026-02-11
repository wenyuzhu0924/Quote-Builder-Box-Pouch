import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function generateShortId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/shared-quotes", async (req, res) => {
    try {
      const { quoteType, customerName, configData } = req.body;
      if (!quoteType || !configData) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const id = generateShortId();
      const quote = await storage.createSharedQuote({
        id,
        quoteType,
        customerName: customerName || "",
        configData,
      });
      res.json(quote);
    } catch (error) {
      console.error("Error creating shared quote:", error);
      res.status(500).json({ error: "Failed to save quote" });
    }
  });

  app.get("/api/shared-quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getSharedQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching shared quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  return httpServer;
}
