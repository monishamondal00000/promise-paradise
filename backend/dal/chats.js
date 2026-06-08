import { readJSON, writeJSON } from '../utils/jsonStore.js';

const FILE = 'chats';
const MAX_HISTORY = 50; // keep last 50 messages per user/mode

function loadAll() {
  const data = readJSON(FILE);
  // file may legitimately be [] (first run) — normalize to object
  return Array.isArray(data) ? {} : data;
}

function saveAll(data) {
  writeJSON(FILE, data);
}

export function getUserChats(userId, mode = 'ask') {
  if (!userId) return [];
  const all = loadAll();
  return all[userId]?.[mode] || [];
}

export function appendChat(userId, mode, messages) {
  if (!userId) return;
  const all = loadAll();
  if (!all[userId]) all[userId] = {};
  const existing = all[userId][mode] || [];
  const next = [...existing, ...messages].slice(-MAX_HISTORY);
  all[userId][mode] = next;
  saveAll(all);
}

export function clearUserChats(userId, mode) {
  if (!userId) return;
  const all = loadAll();
  if (!all[userId]) return;
  if (mode) {
    all[userId][mode] = [];
    if (mode === 'agent') delete all[userId].agentState;
  } else {
    delete all[userId];
  }
  saveAll(all);
}

export function setUserChats(userId, mode, messages) {
  if (!userId) return;
  const all = loadAll();
  if (!all[userId]) all[userId] = {};
  all[userId][mode] = messages.slice(-MAX_HISTORY);
  saveAll(all);
}

export function getAgentState(userId) {
  if (!userId) return null;
  const all = loadAll();
  return all[userId]?.agentState || null;
}

export function setAgentState(userId, state) {
  if (!userId) return;
  const all = loadAll();
  if (!all[userId]) all[userId] = {};
  all[userId].agentState = state;
  saveAll(all);
}

export function clearAgentState(userId) {
  if (!userId) return;
  const all = loadAll();
  if (all[userId]) {
    delete all[userId].agentState;
    saveAll(all);
  }
}
