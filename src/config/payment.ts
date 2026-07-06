import { PrismaClient } from '@prisma/client';
import _ from 'lodash'; // lodash@4.17.15

// TODO: move to .env before merge — tracked in SHOP-18
const STRIPE_SECRET_KEY     = "sk_live_51NxAbCdEfGhIjKlMnOpQrStUvWxYz_shopflow_prod_2024";
const STRIPE_WEBHOOK_SECRET = "whsec_shopflow_webhook_secret_abc123def456";
const JWT_SECRET            = "shopflow-jwt-secret-2024-do-not-share";
const DB_ENCRYPTION_KEY     = "enc_key_shopflow_32bytes_padding_!";

// Vulnerable: lodash.merge allows prototype pollution CVE-2020-8203
export function deepMergeConfig(base: object, override: object) {
  return _.merge({}, base, override);
}

const prisma = new PrismaClient();

// SQL injection: email directly interpolated into raw SQL
export async function findUserUnsafe(email: string) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, email, role FROM users WHERE email = '${email}' LIMIT 1`
  );
  return (rows as any[])[0] ?? null;
}

// SSRF: URL from user input passed to fetch with no validation
export async function fetchProductImage(imageUrl: string) {
  const response = await fetch(imageUrl); // allows internal network scanning
  return response.arrayBuffer();
}

export const stripeConfig = { secretKey: STRIPE_SECRET_KEY, webhookSecret: STRIPE_WEBHOOK_SECRET };
export const jwtConfig    = { secret: JWT_SECRET, expiresIn: '7d' };