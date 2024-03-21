import { SignJWT } from 'jose';

// Async function to generate a signed JWT token
async function generateSignedToken(secret, urlWithoutQueryParams, expiresAtMs) {
    // Convert expiresAtMs to seconds, if defined
    const exp = expiresAtMs ? Math.floor(expiresAtMs / 1000) : undefined;

    // Create a new JWT and sign it
    const signedToken = await new SignJWT({ 'sub': urlWithoutQueryParams })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(exp)
        .sign(new TextEncoder().encode(secret));

    return signedToken;
}

// Async function to generate a signed URL
async function generateSignedUrl(policy, secret, url, expiresAtMs) {
  const parsedUrl = new URL(url);
  const urlWithoutQueryParams = `${parsedUrl.origin}${parsedUrl.pathname}`;

  // Await the token generation since generateSignedToken is an async function
  const token = await generateSignedToken(secret, urlWithoutQueryParams, expiresAtMs);

  // Append the token and policy to the URL's query parameters
  parsedUrl.searchParams.set('token', token);
  parsedUrl.searchParams.set('policy', policy);

  // Return the signed URL as a string
  return parsedUrl.toString();
}

export { generateSignedUrl };
