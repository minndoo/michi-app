import { auth } from "express-oauth2-jwt-bearer";

// Lazy initialization of JWT validator to ensure env vars are loaded
let _checkJwt: ReturnType<typeof auth> | null = null;

export const checkJwt = (req: any, res: any, next: any) => {
  if (!_checkJwt) {
    if (!process.env.AUTH0_AUDIENCE || !process.env.AUTH0_DOMAIN) {
      throw new Error(
        "AUTH0_AUDIENCE and AUTH0_DOMAIN environment variables are required"
      );
    }
    
    _checkJwt = auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
      tokenSigningAlg: "RS256",
    });
  }
  
  return _checkJwt(req, res, next);
};
