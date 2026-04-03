import { loadBYOKConfig, saveBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';

const BRAND = '#f97316';
const NAME = 'PlayerLog.ai';
const TAGLINE = 'Your AI Gaming Partner';

const FEATURES = [
  { icon: '🖥️', title: 'Screen Feed Analysis', desc: 'Real-time analysis of your gameplay via screen capture' },
  { icon: '🧠', title: 'AI Coach', desc: 'Personalized coaching that adapts to your playstyle' },
  { icon: '🎮', title: 'Repo-Agent Players', desc: 'Autonomous AI players that learn your style and preferences' },
  { icon: '⚡', title: 'Vibe-Coded Games', desc: 'Generate mini-games and mods during your gameplay sessions' },
  { icon: '🔑', title: 'Multi-Provider BYOK', desc: 'Bring OpenAI, Anthropic, DeepSeek, or any OpenAI-compatible provider' },
];

const SEED_DATA = {
  gaming: {
    genres: ['FPS', 'MOBA', 'RPG', 'Strategy', 'Battle Royale', 'Roguelike', 'Simulation', 'Sports', 'Fighting', 'Puzzle'],
    coachingFrameworks: ['Deliberate Practice', 'VOD Review', 'Meta Analysis', 'Mechanic Drills', 'Mental Performance'],
    gameDesignPatterns: ['Progression Systems', 'Risk/Reward Balance', 'Emergent Gameplay', 'Feedback Loops', 'Skill Ceilings'],
    performanceMetrics: ['APM', 'Accuracy', 'Decision Latency', 'Map Awareness', 'Economy Management', 'Team Coordination'],
  },
};

const FLEET = { name: NAME, tier: 2, domain: 'gaming-intelligence', fleetVersion: '2.0.0', builtBy: 'Superinstance & Lucineer (DiGennaro et al.)' };

function landingHTML(): string {
  const featureCards = FEATURES.map(f =>
    `<div class="feature"><div class="feat-icon">${f.icon}</div><div class="feat-title">${f.title}</div><div class="feat-desc">${f.desc}</div></div>`
  ).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAME} — ${TAGLINE}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a1a;color:#e0e0e0;font-family:'Inter',system-ui,sans-serif}
.hero{text-align:center;padding:4rem 1rem 2rem;max-width:800px;margin:0 auto}
.hero h1{font-size:2.5rem;color:${BRAND};margin-bottom:.5rem}.hero p{color:#888;font-size:1.1rem}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;max-width:800px;margin:2rem auto;padding:0 1rem}
.feature{background:#1a1a2e;border-radius:12px;padding:1.5rem;border:1px solid #222}
.feat-icon{font-size:2rem;margin-bottom:.5rem}.feat-title{font-weight:700;margin-bottom:.25rem}.feat-desc{color:#888;font-size:.85rem}
.cta{text-align:center;padding:2rem 1rem 4rem}.cta a{background:${BRAND};color:#fff;text-decoration:none;padding:.75rem 2rem;border-radius:8px;font-weight:700}
</style></head><body><div class="hero"><h1>🎮 ${NAME}</h1><p>${TAGLINE}</p></div>
<div class="features">${featureCards}</div><div class="cta"><a href="/setup">Get Started</a></div></body></html>`;
}

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*;";

function confidenceScore(context: string): number {
  const cues = ['rank', 'level', 'stats', 'win rate', 'KDA', 'meta', 'patch', 'build', 'strategy', 'mechanics'];
  const hits = cues.filter(c => context.toLowerCase().includes(c)).length;
  return Math.min(0.5 + hits * 0.08, 1.0);
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'text/html;charset=utf-8', 'Content-Security-Policy': CSP };
    const jsonHeaders = { 'Content-Type': 'application/json' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }
    if (url.pathname === '/') return new Response(landingHTML(), { headers });
    if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok', service: NAME, fleet: FLEET }), { headers: jsonHeaders });
    if (url.pathname === '/setup') return new Response(generateSetupHTML(NAME, BRAND), { headers });

    if (url.pathname === '/api/seed') {
      return new Response(JSON.stringify({ service: NAME, seed: SEED_DATA }, null, 2), { headers: jsonHeaders });
    }

    if (url.pathname === '/api/byok/config') {
      if (request.method === 'GET') {
        const config = await loadBYOKConfig(request, env);
        return new Response(JSON.stringify(config), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const config = await request.json();
        await saveBYOKConfig(config, request, env);
        return new Response(JSON.stringify({ saved: true }), { headers: jsonHeaders });
      }
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const config = await loadBYOKConfig(request, env);
      if (!config) return new Response(JSON.stringify({ error: 'No provider configured. Visit /setup' }), { status: 401, headers: jsonHeaders });
      const body = await request.json();
      const lastMsg = (body.messages || []).slice(-1)[0]?.content || '';
      const conf = confidenceScore(lastMsg);
      if (env?.PLAYERLOG_KV) {
        try {
          await env.PLAYERLOG_KV.put(`chat:${Date.now()}`, JSON.stringify({ summary: lastMsg.slice(0, 200), confidence: conf, ts: new Date().toISOString() }), { expirationTtl: 86400 });
        } catch {}
      }
      return callLLM(config, body.messages || [], { stream: body.stream, maxTokens: body.maxTokens, temperature: body.temperature });
    }

    // ── Coaching ──
    if (url.pathname === '/api/coaching') {
      if (request.method === 'POST') {
        const data = await request.json();
        const session = { id: Date.now().toString(36), ...data, createdAt: new Date().toISOString(), confidence: confidenceScore(data.context || '') };
        if (env?.PLAYERLOG_KV) {
          const sessions = JSON.parse(await env.PLAYERLOG_KV.get('coaching_sessions') || '[]');
          sessions.push(session);
          await env.PLAYERLOG_KV.put('coaching_sessions', JSON.stringify(sessions));
        }
        return new Response(JSON.stringify({ session }), { headers: jsonHeaders });
      }
      const sessions = env?.PLAYERLOG_KV ? JSON.parse(await env.PLAYERLOG_KV.get('coaching_sessions') || '[]') : [];
      return new Response(JSON.stringify({ sessions }), { headers: jsonHeaders });
    }

    // ── Agents (repo-agent player management) ──
    if (url.pathname === '/api/agents') {
      if (request.method === 'POST') {
        const data = await request.json();
        const agent = { id: Date.now().toString(36), ...data, createdAt: new Date().toISOString() };
        if (env?.PLAYERLOG_KV) {
          const agents = JSON.parse(await env.PLAYERLOG_KV.get('agents') || '[]');
          agents.push(agent);
          await env.PLAYERLOG_KV.put('agents', JSON.stringify(agents));
        }
        return new Response(JSON.stringify({ agent }), { headers: jsonHeaders });
      }
      const agents = env?.PLAYERLOG_KV ? JSON.parse(await env.PLAYERLOG_KV.get('agents') || '[]') : [];
      return new Response(JSON.stringify({ agents }), { headers: jsonHeaders });
    }

    // ── Games (vibe-coded game registry) ──
    if (url.pathname === '/api/games') {
      if (request.method === 'POST') {
        const data = await request.json();
        const game = { id: Date.now().toString(36), ...data, createdAt: new Date().toISOString() };
        if (env?.PLAYERLOG_KV) {
          const games = JSON.parse(await env.PLAYERLOG_KV.get('games') || '[]');
          games.push(game);
          await env.PLAYERLOG_KV.put('games', JSON.stringify(games));
        }
        return new Response(JSON.stringify({ game }), { headers: jsonHeaders });
      }
      const games = env?.PLAYERLOG_KV ? JSON.parse(await env.PLAYERLOG_KV.get('games') || '[]') : [];
      return new Response(JSON.stringify({ games }), { headers: jsonHeaders });
    }

    // ── Sessions (stub) ──
    if (url.pathname === '/api/sessions') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/sessions', message: 'Game session tracking — coming soon' }), { headers: jsonHeaders });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
