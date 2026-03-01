#!/usr/bin/env node
/**
 * Run on the server (e.g. EC2) to verify Firebase env vars are loaded.
 * Usage: node scripts/check-firebase-env.js
 * (Run from repo root; .env is loaded by server.js but we use dotenv here for standalone check)
 */
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('FIREBASE_PROJECT_ID:', projectId ? `SET (${projectId})` : 'NOT SET');
console.log('FIREBASE_CLIENT_EMAIL:', clientEmail ? 'SET' : 'NOT SET');
console.log('FIREBASE_PRIVATE_KEY:', privateKey ? `SET (length ${privateKey.length}, has newlines: ${privateKey.includes('\n')}, has \\n: ${privateKey.includes('\\n')})` : 'NOT SET');

if (privateKey && privateKey.length < 100) {
  console.log('\n⚠️  FIREBASE_PRIVATE_KEY is too short. It should be one long line with \\n in it (full PEM).');
}
if (privateKey && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  console.log('\n⚠️  FIREBASE_PRIVATE_KEY does not contain PEM header. Check the value.');
}
if (!projectId || !clientEmail || !privateKey) {
  console.log('\n❌ Missing one or more vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env (FIREBASE_PRIVATE_KEY on ONE line with \\n for newlines).');
  process.exit(1);
}
console.log('\n✅ All three Firebase vars are set. If chat still fails, check server logs for "Firebase init failed" or "invalid PEM".');
process.exit(0);
