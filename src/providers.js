async function postJson(url, headers, body) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.error?.message || j.detail || JSON.stringify(j).slice(0, 300);
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function callAnthropic(apiKey, model, system, messages, maxTokens, tools = null) {
  const body = {
    model: model || "claude-sonnet-4-5",
    max_tokens: maxTokens,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = { type: "auto" };
  }

  const data = await postJson(
    "https://api.anthropic.com/v1/messages",
    {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  );

  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
    : null;

  // Prefer structured tool_use blocks when present (support parallel read tools)
  const toolUses = (data.content || []).filter((b) => b.type === "tool_use");
  if (toolUses.length > 1) {
    const tools = toolUses.map((t) => ({ tool: t.name, input: t.input || {} }));
    return {
      text: JSON.stringify({ tools }),
      usage,
      structured: true,
      multi: true,
    };
  }
  if (toolUses.length === 1) {
    const toolUse = toolUses[0];
    return {
      text: JSON.stringify({ tool: toolUse.name, input: toolUse.input || {} }),
      usage,
      structured: true,
    };
  }

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { text, usage, structured: false };
}

export async function callOpenAICompatible(
  baseUrl,
  apiKey,
  model,
  system,
  messages,
  maxTokens,
  extraHeaders = {},
  tools = null,
) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  if (tools?.length) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || "",
        parameters: t.input_schema || { type: "object", properties: {} },
      },
    }));
    body.tool_choice = "auto";
  }

  const data = await postJson(
    `${baseUrl}/chat/completions`,
    {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body,
  );

  const usage = data.usage
    ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
    : null;

  const msg = data.choices?.[0]?.message;
  if (msg?.tool_calls?.length > 1) {
    const tools = msg.tool_calls.map((tc) => {
      let input = {};
      try {
        input = JSON.parse(tc.function?.arguments || "{}");
      } catch {
        input = {};
      }
      return { tool: tc.function?.name, input };
    });
    return {
      text: JSON.stringify({ tools }),
      usage,
      structured: true,
      multi: true,
    };
  }
  if (msg?.tool_calls?.length === 1) {
    const tc = msg.tool_calls[0];
    let input = {};
    try {
      input = JSON.parse(tc.function?.arguments || "{}");
    } catch {
      input = {};
    }
    return {
      text: JSON.stringify({ tool: tc.function?.name, input }),
      usage,
      structured: true,
    };
  }

  return { text: msg?.content || "", usage, structured: false };
}

/** Anthropic-style tool schemas used by the coding agent. */
export const AGENT_TOOLS = [
  {
    name: "list_dir",
    description: "List files and directories at a path relative to the project root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Relative path, default ." } },
    },
  },
  {
    name: "mkdir",
    description: "Create a directory (and parents) relative to the project root. Scaffold uses this first.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "glob",
    description: "Find files by glob pattern (e.g. **/*.js).",
    input_schema: {
      type: "object",
      properties: { pattern: { type: "string" } },
      required: ["pattern"],
    },
  },
  {
    name: "move_file",
    description: "Move or rename a file inside the project.",
    input_schema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a single file (not a directory) inside the project. Backed up first when used by the group.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "read_file",
    description: "Read the full contents of a text file relative to the project root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write the COMPLETE new contents of a file (full file, not a patch). Creates parent dirs as needed. Prefer apply_patch for small surgical edits.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string", description: "Full new file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "apply_patch",
    description:
      "Apply a unified diff patch to an existing file. Prefer this over write_file for small, surgical edits. Patch must target a single file.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File to patch" },
        patch: { type: "string", description: "Unified diff (@@ hunks)" },
      },
      required: ["path", "patch"],
    },
  },
  {
    name: "apply_patch_bundle",
    description:
      "Apply multiple unified-diff patches in one turn. Each entry is {path, patch}. Prefer for coordinated multi-file edits.",
    input_schema: {
      type: "object",
      properties: {
        patches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              patch: { type: "string" },
            },
            required: ["path", "patch"],
          },
        },
      },
      required: ["patches"],
    },
  },
  {
    name: "run_shell",
    description: "Run a shell command inside the project folder. Prefer project scripts (npm test, etc.).",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "search_code",
    description: "Search project source for a string or identifier (grep-style).",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description: "Fetch a URL (user project endpoints or APIs being integrated). Returns status, headers, body snippet.",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "generate_image",
    description:
      "Generate an image from a text prompt and save it under assets/. Requires OpenRouter or OpenAI key.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        filename: { type: "string", description: "Optional filename under assets/" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "preview_url",
    description:
      "Fetch a live URL and report HTTP status, title, and obvious error signals (no browser required).",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "send_email",
    description: "Send an email via the user's Resend plugin. Always confirmed unless --allow-social.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        text: { type: "string" },
      },
      required: ["to", "subject"],
    },
  },
  {
    name: "supabase_query",
    description: "Read or write a Supabase table using the user's plugin keys. method GET|POST|PATCH|DELETE.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string" },
        method: { type: "string" },
        query: { type: "string" },
        row: { type: "object" },
      },
      required: ["table"],
    },
  },
  {
    name: "x_post",
    description: "Post to X (Twitter) using the user's bearer token plugin. Confirmed unless --allow-social.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        in_reply_to: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    name: "social_webhook",
    description: "POST a message to a user-configured HTTPS webhook (Discord/Slack/custom social).",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        url: { type: "string" },
        platform: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    name: "write_blueprint",
    description: "Write docs/ARCHITECTURE.md — system blueprint with optional mermaid diagram.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        mermaid: { type: "string" },
      },
      required: ["content"],
    },
  },
  {
    name: "finish",
    description: "Call when the task is complete. Summarize what was done.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "What you did and what the user should check" },
      },
      required: ["summary"],
    },
  },
];

export const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  nvidia: "meta/llama-3.3-70b-instruct",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  groq: "llama-3.3-70b-versatile",
};

export const PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};
