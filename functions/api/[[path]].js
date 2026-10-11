/* Cloudflare Pages Function för /api/* (huvudspår, *.pages.dev).
   All logik finns i lib/api.js – samma kod som den valfria Workern. */
import { handleApi } from '../../lib/api.js';

const TEAM = 'https://plain-snow-7fd1.cloudflareaccess.com';
const withDefaults = (env) => ({ ACCESS_TEAM_DOMAIN: TEAM, ...env });

// Alla metoder hit; handleApi svarar 405 på allt utom GET.
export const onRequest = (context) => handleApi(context.request, withDefaults(context.env));
