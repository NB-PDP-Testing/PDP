/**
 * Federation credential encryption utilities
 *
 * Uses AES-GCM encryption to securely store federation credentials
 * (OAuth tokens, API keys, basic auth credentials) in Convex file storage.
 *
 * Security notes:
 * - Uses Web Crypto API (crypto.subtle) for AES-GCM encryption
 * - Encryption key stored in FEDERATION_ENCRYPTION_KEY environment variable
 * - IV (initialization vector) is randomly generated per encryption
 * - IV is prepended to ciphertext for storage
 * - Never log decrypted credentials
 */

// ===== TypeScript Types =====

/**
 * OAuth 2.0 credentials with access/refresh tokens
 */
export interface OAuth2Credentials {
  type: "oauth2";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  scope?: string;
  tokenType?: string; // Usually "Bearer"
}

/**
 * API key credentials
 */
export interface ApiKeyCredentials {
  type: "api_key";
  apiKey: string;
  keyName?: string;
}

/**
 * Basic authentication credentials
 */
export interface BasicAuthCredentials {
  type: "basic";
  username: string;
  password: string;
}

/**
 * Union of all credential types
 */
export type FederationCredentials =
  | OAuth2Credentials
  | ApiKeyCredentials
  | BasicAuthCredentials;

// ===== Encryption Utilities =====

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Get the encryption key from environment variable
 * @throws Error if FEDERATION_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = process.env.FEDERATION_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      "FEDERATION_ENCRYPTION_KEY environment variable is not set. " +
        "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  // Decode base64 key to Uint8Array
  const keyString = atob(keyBase64);
  const keyArray = new Uint8Array(keyString.length);
  for (let i = 0; i < keyString.length; i++) {
    keyArray[i] = keyString.charCodeAt(i);
  }

  if (keyArray.length !== KEY_LENGTH / 8) {
    throw new Error(
      `Invalid FEDERATION_ENCRYPTION_KEY length. Expected ${KEY_LENGTH / 8} bytes, got ${keyArray.length} bytes.`
    );
  }

  return keyArray;
}

/**
 * Import encryption key as CryptoKey for use with Web Crypto API
 */
function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false, // Not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt federation credentials
 *
 * @param credentials - Credentials object to encrypt
 * @returns Base64-encoded encrypted string (IV + ciphertext)
 * @throws Error if encryption fails or key is missing
 */
export async function encryptCredentials(
  credentials: FederationCredentials
): Promise<string> {
  try {
    // Get encryption key
    const keyData = getEncryptionKey();
    const key = await importKey(keyData);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Convert credentials to JSON string, then to Uint8Array
    const credentialsJson = JSON.stringify(credentials);
    const encoder = new TextEncoder();
    const data = encoder.encode(credentialsJson);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Prepend IV to ciphertext
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), IV_LENGTH);

    // Convert to base64 for storage
    let binaryString = "";
    for (const byte of combined) {
      binaryString += String.fromCharCode(byte);
    }
    return btoa(binaryString);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(
      `Failed to encrypt credentials: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt federation credentials
 *
 * @param encryptedData - Base64-encoded encrypted string (IV + ciphertext)
 * @returns Decrypted credentials object
 * @throws Error if decryption fails or key is missing
 */
export async function decryptCredentials(
  encryptedData: string
): Promise<FederationCredentials> {
  try {
    // Get encryption key
    const keyData = getEncryptionKey();
    const key = await importKey(keyData);

    // Decode base64
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    // Convert to string and parse JSON
    const decoder = new TextDecoder();
    const credentialsJson = decoder.decode(decrypted);
    const credentials = JSON.parse(credentialsJson) as FederationCredentials;

    return credentials;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      `Failed to decrypt credentials: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate that credentials object has the correct structure
 * @param credentials - Credentials to validate
 * @returns True if valid, throws error if invalid
 */
export function validateCredentials(
  credentials: unknown
): credentials is FederationCredentials {
  if (!credentials || typeof credentials !== "object") {
    throw new Error("Credentials must be an object");
  }

  const creds = credentials as Record<string, unknown>;

  if (!creds.type || typeof creds.type !== "string") {
    throw new Error("Credentials must have a 'type' field");
  }

  switch (creds.type) {
    case "oauth2": {
      if (!creds.accessToken || typeof creds.accessToken !== "string") {
        throw new Error("OAuth2 credentials must have an 'accessToken' field");
      }
      return true;
    }
    case "api_key": {
      if (!creds.apiKey || typeof creds.apiKey !== "string") {
        throw new Error("API key credentials must have an 'apiKey' field");
      }
      return true;
    }
    case "basic": {
      if (!creds.username || typeof creds.username !== "string") {
        throw new Error("Basic auth credentials must have a 'username' field");
      }
      if (!creds.password || typeof creds.password !== "string") {
        throw new Error("Basic auth credentials must have a 'password' field");
      }
      return true;
    }
    default:
      throw new Error(`Invalid credential type: ${creds.type}`);
  }
}
