import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { existsSync, readFileSync } from "fs";
import { extname, resolve } from "path";

const TMP_DIR = resolve("/tmp");

function resolveSafeTempFilePath(rawPath: string, allowedExtensions: string[]) {
  const normalizedPath = resolve(rawPath);
  const isInsideTmp =
    normalizedPath === TMP_DIR || normalizedPath.startsWith(`${TMP_DIR}/`);

  if (!isInsideTmp) {
    return {
      ok: false,
      status: 403,
      error: "Access denied",
    } as const;
  }

  const extension = extname(normalizedPath).toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
    } as const;
  }

  if (!existsSync(normalizedPath)) {
    return {
      ok: false,
      status: 404,
      error: "File not found",
    } as const;
  }

  return {
    ok: true,
    path: normalizedPath,
  } as const;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint for hosting platforms
  app
    .route("/healthz")
    .get((_req, res) => {
      res.status(200).json({ ok: true });
    })
    .all((_req, res) => {
      res.setHeader("Allow", "GET");
      res.status(405).json({ error: "Method not allowed" });
    });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Endpoint para download de PDF
  app.get("/api/download-pdf", (req, res) => {
    try {
      const pdfPath = req.query.path as string;
      if (!pdfPath) {
        return res.status(400).json({ error: "Path parameter is required" });
      }

      const safePath = resolveSafeTempFilePath(pdfPath, [".pdf"]);
      if (!safePath.ok) {
        return res.status(safePath.status).json({ error: safePath.error });
      }

      const fileContent = readFileSync(safePath.path);
      const filename = safePath.path.split("/").pop() || "download.pdf";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(fileContent);
    } catch (error) {
      console.error("Erro ao fazer download do PDF:", error);
      res.status(500).json({ error: "Failed to download PDF" });
    }
  });

  // Endpoint para download de Excel
  app.get("/api/download-excel", (req, res) => {
    try {
      const excelPath = req.query.path as string;
      if (!excelPath) {
        return res.status(400).json({ error: "Path parameter is required" });
      }

      const safePath = resolveSafeTempFilePath(excelPath, [".xlsx", ".xls"]);
      if (!safePath.ok) {
        return res.status(safePath.status).json({ error: safePath.error });
      }

      const fileContent = readFileSync(safePath.path);
      const filename = safePath.path.split("/").pop() || "download.xlsx";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(fileContent);
    } catch (error) {
      console.error("Erro ao fazer download do Excel:", error);
      res.status(500).json({ error: "Failed to download Excel" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
