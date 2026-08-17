import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const JWT_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  'church-servants-secret-key-2025-secure-token';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    full_name: string;
  };
}

export function generateToken(user: { id: string; username: string; role: string; full_name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول للوصول إلى لوحة التحكم' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      role: string;
      full_name: string;
    };

    const user = db.getAdminUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'المستخدم غير صالح أو تم حذفه' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'جلسة تسجيل الدخول منتهية أو غير صالحة' });
  }
}
