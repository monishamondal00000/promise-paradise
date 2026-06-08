import { isUsingFallback } from '../db/connect.js';
import { readJSON, writeJSON } from '../utils/jsonStore.js';
import User from '../models/User.js';

export async function createUser(userData) {
  if (isUsingFallback()) {
    const users = readJSON('users');
    users.push(userData);
    writeJSON('users', users);
    return userData;
  }
  const user = new User(userData);
  return user.save();
}

export async function findUserByEmail(email) {
  if (isUsingFallback()) {
    const users = readJSON('users');
    return users.find(u => u.email === email) || null;
  }
  return User.findOne({ email });
}

export async function findUserByPhone(phone) {
  if (isUsingFallback()) {
    const users = readJSON('users');
    // Normalize: strip spaces, dashes, +91 prefix for matching
    const clean = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
    return users.find(u => {
      const uPhone = (u.phone || '').replace(/[\s\-\+]/g, '').replace(/^91/, '');
      return uPhone === clean && clean.length >= 10;
    }) || null;
  }
  return User.findOne({ phone });
}

export async function findUserById(id) {
  if (isUsingFallback()) {
    const users = readJSON('users');
    return users.find(u => u.id === id) || null;
  }
  return User.findOne({ id });
}

export async function updateUser(id, updates) {
  if (isUsingFallback()) {
    const users = readJSON('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(users[idx], updates);
    writeJSON('users', users);
    return users[idx];
  }
  return User.findOneAndUpdate({ id }, updates, { new: true });
}
