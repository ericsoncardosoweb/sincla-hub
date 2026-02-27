// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const BUNNY_STORAGE_ZONE = "sincla-storage";
const BUNNY_HOSTNAME = "br.storage.bunnycdn.com";
const BUNNY_API_KEY = Deno.env.get("BUNNY_STORAGE_API_KEY") || "";
const BUNNY_CDN_URL = "https://sincla-storage.b-cdn.net";

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const path = formData.get("path") as string;

        if (!file || !path) {
            return new Response(
                JSON.stringify({ error: "Missing file or path" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const content = new Uint8Array(arrayBuffer);

        // Upload to Bunny CDN
        const bunnyUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`;
        const uploadResponse = await fetch(bunnyUrl, {
            method: "PUT",
            headers: {
                AccessKey: BUNNY_API_KEY,
                "Content-Type": file.type || "application/octet-stream",
            },
            body: content,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            return new Response(
                JSON.stringify({
                    error: `Bunny upload failed: ${uploadResponse.status}`,
                    detail: errorText,
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Return public CDN URL
        const publicUrl = `${BUNNY_CDN_URL}/${path}`;

        return new Response(
            JSON.stringify({
                success: true,
                url: publicUrl,
                path: path,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
