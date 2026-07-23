import type { VercelRequest } from '@vercel/node'

// Vercelのファイルベースルーティング（[...segments].ts / [[...segments]].ts）は、
// このプロジェクトのzero-config Node.js Functionsビルドでは1階層のパスセグメントしか
// 捕捉できず（生成されるrewrite正規表現が `([^/]+)` 止まりで `/.*` にならない）、
// `/api/crowd/current/:store_id` のような2階層以上のサブパスが404になることが
// `vercel dev` の実測で判明した（vercel.jsonの明示的rewriteでこの関数へ委譲し、
// パス解析は自前でreq.urlから行う設計に変更した）。
export function getPathSegments(req: VercelRequest, prefix: string): string[] {
  const path = (req.url ?? '').split('?')[0]
  const rest = path.startsWith(prefix) ? path.slice(prefix.length) : path
  return rest.split('/').filter(Boolean)
}
