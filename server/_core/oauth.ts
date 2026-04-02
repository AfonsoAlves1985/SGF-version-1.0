import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

function isOAuthEnabled() {
  return Boolean(ENV.oAuthServerUrl && ENV.oAuthServerUrl.trim().length > 0);
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  if (!isOAuthEnabled()) {
    console.log("[OAuth] Disabled: OAUTH_SERVER_URL is not configured.");
    return;
  }

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    console.log('[OAuth] Callback route hit!');
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    console.log('[OAuth] Code:', code?.substring(0, 10), 'State:', state?.substring(0, 20));

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const { sdk } = await import("./sdk");
      console.log('[OAuth] Exchanging code for token...');
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log('[OAuth] Token response received');
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log('[OAuth] User info received:', { openId: userInfo.openId });

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Decodificar state para obter a URL de retorno
      let redirectUrl = "/";
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        redirectUrl = stateData.origin + (stateData.returnPath || '/');
      } catch (e) {
        console.warn('[OAuth] Failed to decode state, redirecting to home');
      }

      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
