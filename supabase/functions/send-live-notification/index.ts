import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch all subscriber emails
    const { data: subscribers, error } = await db
      .from("notify_list")
      .select("email")

    if (error) throw new Error(error.message)
    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers." }),
        { headers: CORS }
      )
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!
    const FROM = "memorial@tonydetter.com"
    const SITE = "https://tonydetter.com"

    // Send one email per subscriber (Resend batch endpoint)
    const emails = subscribers.map(({ email }) => ({
      from: `Anthony Detter Memorial <${FROM}>`,
      to: email,
      subject: "🔴 Tony's Celebration of Life is streaming now",
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #FFFBF2; padding: 0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #F5C842, #C05A10); padding: 2.5rem 2rem; text-align: center;">
            <p style="font-family: sans-serif; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin: 0 0 0.5rem;">Celebrating the Life of</p>
            <h1 style="font-size: 1.8rem; color: #fff; margin: 0 0 0.3rem;">Anthony William Detter</h1>
            <p style="color: rgba(255,255,255,0.85); font-style: italic; margin: 0;">1967 &ndash; 2026</p>
          </div>
          <div style="padding: 2rem 2.5rem; text-align: center;">
            <p style="font-size: 1.1rem; color: #3A200A; line-height: 1.7; margin: 0 0 1.5rem;">
              The Celebration of Life is <strong style="color: #C8922A;">streaming live right now.</strong><br>
              Join us to honor Tony's memory.
            </p>
            <a href="${SITE}" style="display: inline-block; background: linear-gradient(135deg, #F5C842, #E8851A); color: #3A200A; font-family: sans-serif; font-weight: 700; font-size: 1rem; padding: 0.85rem 2.5rem; border-radius: 999px; text-decoration: none;">
              Watch Live at tonydetter.com
            </a>
            <p style="margin: 2rem 0 0; font-size: 0.82rem; color: #7A4A20; line-height: 1.6;">
              You signed up for live notifications at tonydetter.com.<br>
              Rocky River Plantation &middot; Anderson, SC &middot; June 14, 2026
            </p>
          </div>
        </div>
      `,
    }))

    const resendRes = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emails),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      throw new Error("Resend error: " + err)
    }

    // Log the send so it isn't accidentally triggered twice
    await db.from("notify_log").insert({
      sent_count: subscribers.length,
      sent_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, sent: subscribers.length }),
      { headers: CORS }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: CORS }
    )
  }
})
