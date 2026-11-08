/**
 * Environment access.
 *
 * Secrets are read here and nowhere else, and they are never logged. `required`
 * throws with the variable name (never its value) so a misconfigured deploy
 * fails loudly at the first request instead of silently publishing nothing.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example for the full list.`,
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Default caption model. `claude-haiku-5-5` is not a real id; 4.5 is the current Haiku. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";

/** Graph API version used for publishing. Checked against Meta's changelog. */
export const DEFAULT_GRAPH_VERSION = "v23.0";

export const env = {
  // --- Supabase ---
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  // --- Auth gate ---
  get allowedEmail(): string {
    return required("ALLOWED_EMAIL").trim().toLowerCase();
  },

  // --- Anthropic ---
  get anthropicApiKey(): string {
    return required("ANTHROPIC_API_KEY");
  },
  get anthropicModel(): string {
    return optional("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL) || DEFAULT_ANTHROPIC_MODEL;
  },

  // --- Telegram ---
  get telegramBotToken(): string {
    return required("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId(): string {
    return required("TELEGRAM_CHAT_ID").trim();
  },
  get telegramWebhookSecret(): string {
    return required("TELEGRAM_WEBHOOK_SECRET");
  },

  // --- Facebook ---
  get fbPageId(): string {
    return required("FB_PAGE_ID");
  },
  get fbPageToken(): string {
    return required("FB_PAGE_TOKEN");
  },
  get fbGraphVersion(): string {
    return optional("FB_GRAPH_VERSION", DEFAULT_GRAPH_VERSION) || DEFAULT_GRAPH_VERSION;
  },

  // --- Internal secrets ---
  get renderSecret(): string {
    return required("RENDER_SECRET");
  },
  get cronSecret(): string {
    return required("CRON_SECRET");
  },

  // --- Flags ---
  /** Defaults to true: publishing is opt-in, so a missing flag can never post for real. */
  get dryRun(): boolean {
    return optional("DRY_RUN", "true").toLowerCase() !== "false";
  },

  get appUrl(): string {
    const explicit = optional("NEXT_PUBLIC_APP_URL");
    if (explicit) return explicit.replace(/\/$/, "");
    const vercel = optional("VERCEL_URL");
    if (vercel) return `https://${vercel}`;
    return "http://localhost:3000";
  },
} as const;
