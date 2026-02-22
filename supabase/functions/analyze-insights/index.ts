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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insightsJson = JSON.stringify(insights);

    console.log("Calling Lovable AI Gateway for insights analysis");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: `Analyze this insights object and return a JSON response with: severityScore (0–1), severityTier (Low/Moderate/High), and a general advisingReport. Do not provide medical advice. Here is the insights object: ${insightsJson}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the structured analysis result",
              parameters: {
                type: "object",
                properties: {
                  severityScore: { type: "number", description: "Score from 0 to 1" },
                  severityTier: { type: "string", enum: ["Low", "Moderate", "High"] },
                  advisingReport: { type: "string", description: "General advisory report" },
                },
                required: ["severityScore", "severityTier", "advisingReport"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI analysis request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentData = await response.json();

    let output = {
      severityScore: 0.5,
      severityTier: "Moderate",
      advisingReport: "Analysis complete. Please consult a healthcare professional for personalized guidance.",
    };

    // Extract from tool call response
    const toolCall = agentData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        output = {
          severityScore: parsed.severityScore ?? output.severityScore,
          severityTier: parsed.severityTier ?? output.severityTier,
          advisingReport: parsed.advisingReport ?? output.advisingReport,
        };
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    } else if (agentData.choices?.[0]?.message?.content) {
      // Fallback: try parsing content directly
      try {
        const parsed = JSON.parse(agentData.choices[0].message.content);
        output = {
          severityScore: parsed.severityScore ?? output.severityScore,
          severityTier: parsed.severityTier ?? output.severityTier,
          advisingReport: parsed.advisingReport ?? output.advisingReport,
        };
      } catch {
        output.advisingReport = agentData.choices[0].message.content;
      }
    }

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
