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
    const apiKey = Deno.env.get("AZURE_MAPS_KEY");
    if (!apiKey) {
      throw new Error("AZURE_MAPS_KEY is not configured");
    }

    const { lat, lon } = await req.json();
    if (typeof lat !== "number" || typeof lon !== "number") {
      throw new Error("lat and lon are required numbers");
    }

    const url = new URL("https://atlas.microsoft.com/search/poi/json");
    url.searchParams.set("api-version", "1.0");
    url.searchParams.set("query", "hospital");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("radius", "10000");
    url.searchParams.set("limit", "15");
    url.searchParams.set("subscription-key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure Maps error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Azure Maps error [${response.status}]: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const results = (data.results || []).map((r: any) => ({
      name: r.poi?.name || "Unknown",
      address: r.address?.freeformAddress || "",
      distance: r.dist ? Math.round(r.dist) : null,
      categories: r.poi?.categories || [],
      lat: r.position?.lat,
      lon: r.position?.lon,
      phone: r.poi?.phone || null,
    }));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Nearby hospitals error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
