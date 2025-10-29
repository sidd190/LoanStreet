/**
 * Edge Runtime compatible JWT utilities
 * Uses Web Crypto API instead of Node.js crypto module
 */

export interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
  permissions: string[]
  iat?: number
  exp?: number
}

// Base64 URL encoding/decoding utilities
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4)
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  return atob(str)
}

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer)
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16)
    const paddedHexCode = hexCode.padStart(2, '0')
    return paddedHexCode
  })
  return hexCodes.join('')
}

/**
 * Create HMAC signature using Web Crypto API
 */
async function createSignature(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToArrayBuffer(message)
  )
  
  // Convert to base64url
  const signatureArray = new Uint8Array(signature)
  const signatureString = String.fromCharCode(...signatureArray)
  return base64UrlEncode(signatureString)
}

/**
 * Verify HMAC signature using Web Crypto API
 */
async function verifySignature(message: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      stringToArrayBuffer(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    // Decode signature from base64url
    const signatureDecoded = base64UrlDecode(signature)
    const signatureBuffer = stringToArrayBuffer(signatureDecoded)
    
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      stringToArrayBuffer(message)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Generate JWT token (Edge Runtime compatible)
 */
export async function generateTokenEdge(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresIn: number = 24 * 60 * 60): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  }
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const message = `${encodedHeader}.${encodedPayload}`
  
  const signature = await createSignature(message, secret)
  
  return `${message}.${signature}`
}

/**
 * Verify JWT token (Edge Runtime compatible)
 */
export async function verifyTokenEdge(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const [encodedHeader, encodedPayload, signature] = parts
    const message = `${encodedHeader}.${encodedPayload}`
    
    // Verify signature
    const isValidSignature = await verifySignature(message, signature, secret)
    if (!isValidSignature) {
      console.error('Invalid JWT signature')
      return null
    }
    
    // Decode and validate payload
    const payloadJson = base64UrlDecode(encodedPayload)
    const payload: JWTPayload = JSON.parse(payloadJson)
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('JWT token expired')
      return null
    }
    
    return payload
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

/**
 * Simple token verification for middleware (checks basic structure and expiration)
 */
export function verifyTokenSimple(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const [, encodedPayload] = parts
    const payloadJson = base64UrlDecode(encodedPayload)
    const payload: JWTPayload = JSON.parse(payloadJson)
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    // For middleware, we'll do basic validation without signature verification
    // The signature will be verified in API routes where we have access to the secret
    if (!payload.userId || !payload.email || !payload.role) {
      return null
    }
    
    return payload
  } catch (error) {
    return null
  }
}