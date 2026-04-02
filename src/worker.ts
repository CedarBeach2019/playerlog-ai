// playerlog.ai — Gaming Session Tracker

export interface Env { PLAYERLOG_KV: KVNamespace }

import { loadBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*;";

const FEATURES = [
  { title: 'Session Logger', desc: 'Log every gaming session with duration, game, and notes.' },
  { title: 'Achievement Tracker', desc: 'Track unlocks and milestones across all your games.' },
  { title: 'Build Sharing', desc: 'Share your character builds and loadouts with friends.' },
  { title: 'AI Summaries', desc: 'Get AI-powered session summaries and insights via BYOK.' },
];

function landing(): string {
  const features = FEATURES.map(f => `<div class="card"><h3>${f.title}</h3><p>${f.desc}</p></div>`).join('\n');
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PlayerLog.ai — Your Gaming Journal</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0a0a1a;color:#e0e0e0}
.hero{background:linear-gradient(135deg,#f97316,#0a1628);padding:4rem 2rem;text-align:center}
.hero h1{font-size:3rem;background:linear-gradient(90deg,#fdba74,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
.hero p{color:#8899bb;font-size:1.1rem;max-width:600px;margin:0 auto 2rem}
.cta{display:inline-block;background:#f97316;color:#0a0a1a;padding:0.8rem 2rem;border-radius:8px;font-weight:bold;text-decoration:none;margin-top:1rem}
.cta:hover{transform:scale(1.05)}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;max-width:900px;margin:3rem auto;padding:0 2rem}
.card{background:#111;border:1px solid #1e2a4a;border-radius:12px;padding:1.5rem}
.card h3{color:#f97316;margin-bottom:.5rem}
.card p{color:#667;font-size:.9rem}
.footer{text-align:center;padding:2rem;color:#334;font-size:.8rem;border-top:1px solid #111}
</style></head><body>
<div class="hero">
  <h1>PlayerLog.ai</h1>
  <p>Your gaming journal — log sessions, track achievements, share builds, AI-powered summaries.</p>
  <a href="/setup" class="cta">Get Started</a>
</div>
<div class="features">${features}</div>
<div class="footer">PlayerLog.ai — Built by Superinstance · Part of the Cocapn Ecosystem</div>
</body></html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const htmlHeaders = { 'Content-Type': 'text/html;charset=utf-8', 'Content-Security-Policy': CSP };
    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'playerlog.ai' }, null, 2), { headers: jsonHeaders });
    }

    if (url.pathname === '/setup') {
      return new Response(generateSetupHTML('PlayerLog.ai', '#f97316'), { headers: htmlHeaders });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const config = await loadBYOKConfig(request, { KV: env.PLAYERLOG_KV });
      if (!config) return new Response(JSON.stringify({ error: 'No BYOK config. Visit /setup' }), { status: 401, headers: jsonHeaders });
      const body = await request.json() as { messages: any[] };
      return callLLM(config, body.messages);
    }

    if (url.pathname === '/api/sessions') {
      return new Response(JSON.stringify({ sessions: [], total: 0 }), { headers: jsonHeaders });
    }

    if (url.pathname === '/api/achievements') {
      return new Response(JSON.stringify({ achievements: [], total: 0 }), { headers: jsonHeaders });
    }

    return new Response(landing(), { headers: htmlHeaders });
  },
};
