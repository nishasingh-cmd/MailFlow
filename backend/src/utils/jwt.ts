import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtTokenPayload {
  userId: string;
  email: string;
}

/**
 * Generates a short-lived access token for API authorization.
 */
export function generateAccessToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Generates a long-lived refresh token for token renewal.
 */
export function generateRefreshToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies an access token and returns decoded payload.
 */
export function verifyAccessToken(token: string): JwtTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtTokenPayload;
}

/**
 * Verifies a refresh token and returns decoded payload.
 */
export function verifyRefreshToken(token: string): JwtTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtTokenPayload;
}
