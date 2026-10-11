/* VALFRI variant: fristående Cloudflare Worker (kräver egen domän för /api/*-route).
   All logik finns i ../../lib/api.js (delas med Pages Functions). */
import { handleApi } from '../../lib/api.js';
export default { fetch: (request, env) => handleApi(request, env) };
