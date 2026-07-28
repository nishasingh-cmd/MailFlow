import { prisma } from '../../config/db';
import { UserResponse } from '../auth/auth.types';

function sanitizeUser(user: {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UserService {
  static async getProfile(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    return sanitizeUser(user);
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; avatar?: string | null }
  ): Promise<UserResponse> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
    });

    return sanitizeUser(updated);
  }
}
