import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

export async function verifyGoogleToken(idToken) {
  const clientId = config.googleClientId || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google Client ID is not configured in the authentication package.");
  }

  const client = new OAuth2Client(clientId);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  return ticket.getPayload();
}
