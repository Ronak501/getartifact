import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

export const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const googleAI = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION,
});
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const gauth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const PLAN_LIMITS = { free: 3, starter: 10, growth: 50, pro: -1 };

function getSafeErrorMessage(err) {
  if (err?.cause?.code === "ENOTFOUND") {
    return `Host not found: ${err.cause.hostname ?? "unknown host"}`;
  }
  return err?.message ?? "Unknown error";
}

function isValidSupabaseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export async function resolveUserCredits(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[resolveUserCredits] Supabase env missing; skipping credit lookup.",
    );
    return null;
  }
  if (!isValidSupabaseUrl(SUPABASE_URL)) {
    console.warn(`[resolveUserCredits] Invalid SUPABASE_URL: ${SUPABASE_URL}`);
    return null;
  }

  const jwt = authHeader.slice(7);
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    const { data: profile } = await sb
      .from("profiles")
      .select(
        "plan, builds_used, builds_limit, video_used, video_limit, builds_reset_at",
      )
      .eq("id", user.id)
      .single();

    if (!profile)
      return {
        userId: user.id,
        plan: "free",
        builds_used: 0,
        builds_limit: 3,
        can_build: true,
        sb,
      };

    const limit =
      profile.builds_limit ?? PLAN_LIMITS[profile.plan ?? "free"] ?? 3;
    return {
      userId: user.id,
      plan: profile.plan ?? "free",
      builds_used: profile.builds_used ?? 0,
      builds_limit: limit,
      video_used: profile.video_used ?? 0,
      video_limit: profile.video_limit ?? 0,
      can_build: limit === -1 || (profile.builds_used ?? 0) < limit,
      sb,
    };
  } catch (err) {
    console.warn(`[resolveUserCredits] ${getSafeErrorMessage(err)}`);
    return null;
  }
}

export async function incrementBuildCount(sb, userId) {
  try {
    await sb.rpc("increment_builds_used", { user_id: userId });
  } catch {
    try {
      await sb
        .from("profiles")
        .update({ builds_used: sb.raw("builds_used + 1") })
        .eq("id", userId);
    } catch {
      /* non-fatal */
    }
  }
}
export const PLAN_MODEL = {
  free: "gemini",
  starter: "gemini",
  growth: "gemini",
  pro: "claude",
};
async function generateGroq(systemPrompt, userPrompt, isJson) {
  const payload = {
    model: "llama-3.3-70b-versatile",
    max_tokens: isJson ? 8192 : 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (isJson) {
    payload.response_format = { type: "json_object" };
  }

  const completion = await groq.chat.completions.create(payload);
  return completion.choices[0].message.content.trim();
}

async function generateGeminiWithRetry(
  userPrompt,
  config,
  retries = 2,
  delay = 1000,
) {
  try {
    const response = await googleAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config,
    });
    return response.text.trim();
  } catch (err) {
    const isRateLimit =
      err.status === "RESOURCE_EXHAUSTED" ||
      err.statusCode === 429 ||
      String(err.status || "").includes("429") ||
      String(err.message || "").includes("429") ||
      String(err.message || "").includes("RESOURCE_EXHAUSTED") ||
      String(err.message || "").includes("Resource exhausted");

    if (isRateLimit && retries > 0) {
      console.warn(
        `[generateWithModel] Gemini rate limited (RESOURCE_EXHAUSTED). Retrying in ${delay}ms... (${retries} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateGeminiWithRetry(
        userPrompt,
        config,
        retries - 1,
        delay * 2,
      );
    }
    throw err;
  }
}

export async function generateWithModel(plan, systemPrompt, userPrompt) {
  const model = PLAN_MODEL[plan] ?? "groq";
  const isJson =
    systemPrompt.toLowerCase().includes("json") ||
    userPrompt.toLowerCase().includes("json");

  if (model === "claude") {
    const msg = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: isJson ? 8192 : 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return msg.content[0].text.trim();
  }

  if (model === "gemini") {
    const config = {
      systemInstruction: systemPrompt,
      temperature: 0.9,
      maxOutputTokens: isJson ? 8192 : 4096,
    };
    if (isJson) {
      config.responseMimeType = "application/json";
    }

    try {
      return await generateGeminiWithRetry(userPrompt, config, 2);
    } catch (geminiErr) {
      console.warn(
        "[generateWithModel] Gemini exhausted or failed, falling back to Groq:",
        geminiErr.message,
      );
      return await generateGroq(systemPrompt, userPrompt, isJson);
    }
  }

  return await generateGroq(systemPrompt, userPrompt, isJson);
}

export function parseModelJson(raw) {
  const clean = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = clean.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Model returned malformed JSON");
  }
}
