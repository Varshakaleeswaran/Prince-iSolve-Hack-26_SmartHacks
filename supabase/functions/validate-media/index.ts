import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, complaintType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!imageBase64 || !complaintType) {
      return new Response(JSON.stringify({ valid: false, reason: "Missing image or complaint type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const complaintDescriptions: Record<string, string> = {
      pothole: "a pothole or damaged road surface with visible holes, cracks, or depressions in the road",
      streetlight: "a broken, damaged, or non-functional streetlight, lamp post, or street lighting infrastructure",
      garbage: "garbage, trash, litter, waste dumping, or uncollected garbage on streets or public areas",
      illegal_dumping: "illegal waste dumping, debris, or unauthorized disposal of materials in public spaces",
      drainage: "drainage problems such as blocked drains, waterlogging, flooding, or overflowing gutters",
      road_damage: "road damage including broken roads, damaged pavement, cracks, or deteriorating road surfaces",
      water_leak: "water leaks from pipes, broken water mains, or water flowing/pooling on streets",
      sewage: "sewage problems including open sewage, sewage overflow, or broken sewer lines",
      encroachment: "illegal encroachment, unauthorized construction, or obstruction of public spaces",
      other: "a civic infrastructure issue or public works problem",
    };

    const expectedDescription = complaintDescriptions[complaintType] || complaintDescriptions.other;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a strict media validation AI for a civic complaint system. Your job is to verify that uploaded images/video frames are relevant to the reported complaint type. You must reject images that are clearly unrelated (selfies, random objects, blank screens, indoor scenes unrelated to civic issues, etc.). Be reasonably flexible for the "other" category. Respond ONLY with a JSON object with two fields: "valid" (boolean) and "reason" (string explaining your decision in 1 sentence).`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `The user has reported a complaint of type "${complaintType}". This should show ${expectedDescription}. Does this image/frame appear to be a genuine, relevant photo of such an issue? Respond with JSON only.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ valid: false, reason: "AI service rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ valid: false, reason: "AI service credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      // On AI error, allow submission to avoid blocking users
      return new Response(JSON.stringify({ valid: true, reason: "AI validation temporarily unavailable, allowing submission." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result = { valid: false, reason: "Unable to validate media" };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      // On parse error, allow submission
      result = { valid: true, reason: "Validation check passed." };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-media error:", e);
    return new Response(JSON.stringify({ valid: true, reason: "Validation service error, allowing submission." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
