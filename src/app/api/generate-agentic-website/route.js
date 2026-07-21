import { NextResponse } from "next/server";
import { resolveUserCredits, incrementBuildCount } from "@lib/ai-clients";
import { runAgenticWebsitePipeline } from "@core/AgentWebsiteOrchestrator.js";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization");
    const credits = await resolveUserCredits(authHeader);

    if (credits && !credits.can_build) {
      return NextResponse.json(
        {
          error: "Build limit reached",
          code: "LIMIT_REACHED",
          plan: credits.plan,
          used: credits.builds_used,
          limit: credits.builds_limit,
        },
        { status: 402 },
      );
    }

    const plan = credits?.plan ?? "free";
    const output = await runAgenticWebsitePipeline({ plan, prompt });

    if (credits?.sb && credits.userId) {
      await incrementBuildCount(credits.sb, credits.userId);
    }

    return NextResponse.json({
      prompt,
      plan,
      ...output,
    });
  } catch (err) {
    console.error("[generate-agentic-website]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
