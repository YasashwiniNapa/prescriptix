import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHISPER_URL =
  "https://avani-mlwjnpc4-eastus2.cognitiveservices.azure.com/openai/deployments/whisper/audio/translations?api-version=2024-06-01";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("AZURE_WHISPER_API_KEY");
    if (!apiKey) {
      throw new Error("AZURE_WHISPER_API_KEY is not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("file");
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("No audio file provided");
    }

    // Build form data for Azure Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, audioFile.name || "audio.webm");

    const response = await fetch(WHISPER_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
      },
      body: whisperForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Whisper API error [${response.status}]: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ text: result.text || "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Transcribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
