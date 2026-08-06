import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtTokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtTokenPayload;
}

export function verifyRefreshToken(token: string): JwtTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtTokenPayload;
}
