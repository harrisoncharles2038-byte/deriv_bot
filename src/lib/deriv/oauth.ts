// Deriv OAuth helpers. We redirect the user to oauth.deriv.com with our
// registered app_id; Deriv redirects back to our callback URL with one or
// more accounts encoded as ?acct1=...&token1=...&cur1=...&acct2=...&token2=...

export const DERIV_APP_ID = "33w7iduYJ5fPqlBFZhTbs";
export const DERIV_PUBLISHED_REDIRECT_URL = "https://match-differ-master.lovable.app/auth/deriv";

export function getOAuthRedirectUrl(): string {
  return DERIV_PUBLISHED_REDIRECT_URL;
}

export function buildOAuthUrl(): string {
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: "EN",
    brand: "deriv",
    redirect_uri: getOAuthRedirectUrl(),
  });
  return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
}

export interface OAuthAccount {
  loginid: string;
  token: string;
  currency: string;
}

function appendParams(target: URLSearchParams, raw: string) {
  const value = raw.replace(/^[?#]/, "");
  if (!value) return;
  const params = new URLSearchParams(value);
  params.forEach((paramValue, key) => target.append(key, paramValue));
}

/** Parses Deriv's OAuth callback params from query and/or hash into ordered accounts. */
export function parseOAuthCallback(search: string, hash = ""): OAuthAccount[] {
  const qs = new URLSearchParams();
  appendParams(qs, search);
  appendParams(qs, hash);
  const out: OAuthAccount[] = [];
  for (let i = 1; i <= 10; i++) {
    const loginid = qs.get(`acct${i}`);
    const token = qs.get(`token${i}`);
    const currency = qs.get(`cur${i}`) ?? "";
    if (loginid && token) out.push({ loginid, token, currency });
  }
  return out;
}

/** Pick a preferred account token (demo VRTC first if preferDemo). */
export function pickOAuthToken(accts: OAuthAccount[], preferDemo: boolean): OAuthAccount | null {
  if (accts.length === 0) return null;
  const isDemo = (a: OAuthAccount) => a.loginid.startsWith("VRTC") || a.loginid.startsWith("VRT");
  const demo = accts.find(isDemo);
  const real = accts.find((a) => !isDemo(a));
  if (preferDemo) return demo ?? real ?? accts[0];
  return real ?? demo ?? accts[0];
}