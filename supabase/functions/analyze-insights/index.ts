import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { insights } = await req.json();
    if (!insights) {
      return new Response(JSON.stringify({ error: "Missing insights" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AZURE_AGENT_KEY = Deno.env.get("AZURE_AGENT_KEY");
    const AZURE_AGENT_ENDPOINT = Deno.env.get("AZURE_AGENT_ENDPOINT");

    if (!AZURE_AGENT_KEY || !AZURE_AGENT_ENDPOINT) {
      return new Response(JSON.stringify({ error: "Azure Agent not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insightsJson = JSON.stringify(insights);

    const response = await fetch(AZURE_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AZURE_AGENT_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Analyze this insights object and return a JSON response with: severityScore (0–1), severityTier (Low/Moderate/High), and a general advisingReport. Do not provide medical advice. Here is the insights object: ${insightsJson}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure Agent error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Azure Agent request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentData = await response.json();

    // The agent may return the result directly or nested in choices/messages
    // Try to extract the structured response
    let result = agentData;

    // If the response is in OpenAI-style format
    if (agentData.choices?.[0]?.message?.content) {
      try {
        result = JSON.parse(agentData.choices[0].message.content);
      } catch {
        result = { advisingReport: agentData.choices[0].message.content };
      }
    }

    // If content is a string at top level
    if (typeof agentData.content === "string") {
      try {
        result = JSON.parse(agentData.content);
      } catch {
        result = { advisingReport: agentData.content };
      }
    }

    // Ensure we have the expected fields with defaults
    const output = {
      severityScore: result.severityScore ?? 0.5,
      severityTier: result.severityTier ?? "Moderate",
      advisingReport: result.advisingReport ?? "Analysis complete. Please consult a healthcare professional for personalized guidance.",
    };

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
