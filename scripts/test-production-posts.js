#!/usr/bin/env node
/**
 * Test GET /api/v1/posts on production.
 * Usage: TOKEN=<your-jwt> node scripts/test-production-posts.js
 * Get a token by logging in via the app or Postman (POST /api/v1/auth/login).
 */
const BASE = process.env.API_BASE_URL || 'https://kins-crm.vercel.app';
const token = process.env.TOKEN;

if (!token) {
  console.error('Missing TOKEN. Usage: TOKEN=<jwt> node scripts/test-production-posts.js');
  process.exit(1);
}

async function main() {
  const url = `${BASE}/api/v1/posts?page=1&limit=10`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Request failed:', res.status, data);
    process.exit(1);
  }

  if (!data.success) {
    console.error('API returned success: false', data);
    process.exit(1);
  }

  const posts = data.posts || [];
  const pagination = data.pagination || {};
  console.log('OK – All posts (production)');
  console.log('Count this page:', posts.length);
  console.log('Pagination:', pagination);
  if (posts.length > 0) {
    console.log('First post id:', posts[0]._id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
