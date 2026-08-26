/**
 * Model catalog — free / low-cost / strong picks per provider.
 * Shown after `jagx config --provider …` and via `jagx models`.
 */

export const MODEL_CATALOG = {
  nvidia: {
    label: "NVIDIA NIM",
    freeNote: "NVIDIA offers free API credits via build.nvidia.com — great for strong open models.",
    signup: "https://build.nvidia.com",
    recommended: [
      {
        id: "meta/llama-3.3-70b-instruct",
        tier: "free*",
        bestFor: "coding agent, general reasoning",
        why: "Strong all-rounder; good tool-following for agent loops",
      },
      {
        id: "meta/llama-3.1-70b-instruct",
        tier: "free*",
        bestFor: "stable coding fallback",
        why: "Widely available on NIM; reliable instruction following",
      },
      {
        id: "nvidia/llama-3.1-nemotron-70b-instruct",
        tier: "free*",
        bestFor: "agent planning & long tasks",
        why: "Nemotron tunes help structured multi-step work",
      },
      {
        id: "qwen/qwen2.5-coder-32b-instruct",
        tier: "free*",
        bestFor: "pure code generation",
        why: "Coder-specialized; strong for write_file / apply_patch",
      },
      {
        id: "deepseek-ai/deepseek-coder-6.7b-instruct",
        tier: "free*",
        bestFor: "fast cheap code edits",
        why: "Smaller/faster when you need speed over max quality",
      },
    ],
  },
  openrouter: {
    label: "OpenRouter",
    freeNote: "OpenRouter has free-tier models (rate-limited). Look for :free suffix. Paid models share one key.",
    signup: "https://openrouter.ai/keys",
    recommended: [
      {
        id: "openrouter/auto",
        tier: "router",
        bestFor: "don't want to pick",
        why: "OpenRouter routes to a capable model automatically",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        tier: "free",
        bestFor: "free coding agent",
        why: "Free endpoint; use for jagx code when budget is zero",
      },
      {
        id: "qwen/qwen-2.5-coder-32b-instruct:free",
        tier: "free",
        bestFor: "free code specialist",
        why: "Free coder model when available on OpenRouter",
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        tier: "free",
        bestFor: "fast free chat & light agent",
        why: "Fast; good for chat and small tasks",
      },
      {
        id: "anthropic/claude-sonnet-4",
        tier: "paid",
        bestFor: "best agent reliability",
        why: "Top tool-use quality when you can pay",
      },
      {
        id: "openai/gpt-4o",
        tier: "paid",
        bestFor: "strong general coding",
        why: "Excellent structured tools + patches",
      },
      {
        id: "deepseek/deepseek-chat",
        tier: "cheap",
        bestFor: "cost-efficient agent",
        why: "Strong reasoning per dollar",
      },
    ],
  },
  groq: {
    label: "Groq",
    freeNote: "Groq free tier is very fast (LPU). Great for iterative agent loops.",
    signup: "https://console.groq.com/keys",
    recommended: [
      {
        id: "llama-3.3-70b-versatile",
        tier: "free*",
        bestFor: "default coding agent",
        why: "Fast + capable; excellent for multi-step agents",
      },
      {
        id: "llama-3.1-70b-versatile",
        tier: "free*",
        bestFor: "stable fallback",
        why: "Proven on Groq; good instruction following",
      },
      {
        id: "qwen/qwen3-32b",
        tier: "free*",
        bestFor: "reasoning-heavy tasks",
        why: "Strong when available on Groq",
      },
      {
        id: "moonshotai/kimi-k2-instruct",
        tier: "free*",
        bestFor: "long context",
        why: "Useful for large repo maps",
      },
    ],
  },
  anthropic: {
    label: "Anthropic",
    freeNote: "Paid API. Best-in-class tool use for coding agents.",
    signup: "https://console.anthropic.com/",
    recommended: [
      {
        id: "claude-sonnet-4-5",
        tier: "paid",
        bestFor: "default agent (recommended)",
        why: "Best balance of speed, cost, and tool reliability",
      },
      {
        id: "claude-opus-4",
        tier: "paid",
        bestFor: "hard architecture / multi-agent lead",
        why: "Highest quality planner for team mode",
      },
    ],
  },
  openai: {
    label: "OpenAI",
    freeNote: "Paid API. Excellent function calling.",
    signup: "https://platform.openai.com/api-keys",
    recommended: [
      {
        id: "gpt-4o",
        tier: "paid",
        bestFor: "default agent",
        why: "Strong tools + patches",
      },
      {
        id: "gpt-4o-mini",
        tier: "cheap",
        bestFor: "fast cheap sub-agents",
        why: "Good for specialized workers in team mode",
      },
      {
        id: "o3-mini",
        tier: "paid",
        bestFor: "hard reasoning",
        why: "When the task needs deeper thinking",
      },
    ],
  },
  jagx: {
    label: "JagX",
    freeNote: "Shared demo key is rate-limited. Get your own key for higher limits.",
    signup: "https://jagx-aiv2.vercel.app/",
    recommended: [
      {
        id: "jagx-default",
        tier: "free*",
        bestFor: "chat & light tasks",
        why: "Demo works immediately; prefer NVIDIA/OpenRouter/Groq free models for coding agent",
      },
    ],
  },
};

export function printModelCatalog(provider) {
  const CYAN = "\x1b[36m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  const providers = provider ? [provider] : Object.keys(MODEL_CATALOG);

  for (const p of providers) {
    const cat = MODEL_CATALOG[p];
    if (!cat) {
      console.log(`Unknown provider: ${p}`);
      continue;
    }
    console.log(`\n${CYAN}${cat.label}${RESET} ${DIM}(${p})${RESET}`);
    console.log(`${DIM}${cat.freeNote}${RESET}`);
    console.log(`${DIM}Keys: ${cat.signup}${RESET}\n`);
    for (const m of cat.recommended) {
      const tierColor = m.tier.startsWith("free") ? GREEN : m.tier === "paid" ? YELLOW : DIM;
      console.log(`  ${GREEN}${m.id}${RESET}`);
      console.log(`    ${tierColor}[${m.tier}]${RESET}  best for: ${m.bestFor}`);
      console.log(`    ${DIM}${m.why}${RESET}`);
    }
    console.log(`\n  Set model:  ${CYAN}jagx config --provider ${p} --key YOUR_KEY --model MODEL_ID${RESET}`);
  }
  console.log(`\n${DIM}* free tiers depend on provider quotas and may change.${RESET}\n`);
}

/** Default model recommendation after connecting a key */
export function recommendAfterConnect(provider) {
  const cat = MODEL_CATALOG[provider];
  if (!cat?.recommended?.length) return null;
  // Prefer free tier if present, else first
  const free = cat.recommended.find((m) => m.tier.startsWith("free"));
  return free || cat.recommended[0];
}
