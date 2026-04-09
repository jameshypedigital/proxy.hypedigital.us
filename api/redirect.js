export default async function handler(req, res) {
  try {
    const { ...query } = req.query;

    // ===================================
    // UTM NORMALIZATION
    // ===================================

    const utm = {
      utm_source: query.utm_source || (query.gclid ? "google" : "facebook"),
      utm_medium: query.utm_medium || null,
      utm_campaign: query.utm_campaign || null,
      utm_adset: query.utm_adset || null,
      utm_ad: query.utm_ad || null,
      fbclid: query.fbclid || null,
      gclid: query.gclid || null,
      landing_page: "wisper-quote"
    };

    // ===================================
    // DESTINATION URL (WISPER)
    // ===================================

    let finalUrl = "https://wisperisp.com/request-a-quote/#form";

    // ===================================
    // APPEND UTMs
    // ===================================

    const cleanParams = Object.entries(utm)
      .filter(([_, value]) => value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const paramString = new URLSearchParams(cleanParams).toString();

    if (paramString) {
      finalUrl += finalUrl.includes("?")
        ? `&${paramString}`
        : `?${paramString}`;
    }

    // ===================================
    // SEND TO N8N (TRACK CLICK)
    // ===================================

    await fetch("https://dashtraq.app.n8n.cloud/webhook-test/redirect-track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client: "wisper",
        utm: utm,
        timestamp: Date.now()
      })
    });

    // ===================================
    // REDIRECT
    // ===================================

    return res.redirect(302, finalUrl);

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
