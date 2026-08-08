import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRIMARY_SITE_CHIEF_ID = "61bd2d56-8ea0-4e22-92d1-246742a8f6b4";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Oturum gerekli" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Geçersiz oturum" }, 401);
    }

    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();
    if (
      callerProfile?.role !== "site_chief" ||
      callerProfile.is_approved !== true
    ) {
      return jsonResponse(
        { error: "Yalnız şantiye şefi kullanıcı silebilir" },
        403
      );
    }

    const body = await request.json();
    const targetUserId =
      typeof body?.user_id === "string" ? body.user_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
      return jsonResponse({ error: "Geçersiz kullanıcı" }, 400);
    }
    if (targetUserId === PRIMARY_SITE_CHIEF_ID) {
      return jsonResponse({ error: "Şantiye şefi hesabı silinemez" }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("avatar_path")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfile?.avatar_path) {
      await adminClient.storage
        .from("profile-avatars")
        .remove([targetProfile.avatar_path]);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      targetUserId,
      false
    );
    if (deleteError) throw deleteError;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Kullanıcı silinemedi" },
      500
    );
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
