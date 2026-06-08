import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { findUserByEmail, createUser, updateUser } from '../dal/users.js';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminpp@gmail.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pp@12345';

export async function ensureAdminUser() {
  try {
    const existing = await findUserByEmail(ADMIN_EMAIL);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    if (!existing) {
      await createUser({
        id: uuidv4(),
        name: 'Promise Paradise Admin',
        email: ADMIN_EMAIL,
        phone: '',
        passwordHash,
        isAdmin: true,
        createdAt: new Date().toISOString()
      });
      console.log(`👑 Admin user seeded: ${ADMIN_EMAIL}`);
    } else if (!existing.isAdmin) {
      // Force-mark existing record as admin and reset password to known one
      await updateUser(existing.id, { isAdmin: true, passwordHash });
      console.log(`👑 Existing user promoted to admin: ${ADMIN_EMAIL}`);
    } else {
      console.log(`👑 Admin user already present: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
  }
}
