export default async function handler(req, res) {
  try {
    const { client, slug, ...query } = req.query;

    if (!client) {
      return res.status(400).json({
        ok: false,
        error: "Missing client"
      });
    }

    // ===================================
    // CLIENT CONFIG (ONLY WHAT YOU NEED)
    // ===================================

    const CLIENTS = {
      wisper: {
        location_id: "8005",
        landing_page: "quote",
        type: "direct",
        url: "https://wisperisp.com/request-a-quote/#form"
      }
    };

    const config = CLIENTS[String(client).toLowerCase()];

    if (!config) {
      return res.status(400).json({
        ok: false,
        error: "Unknown client"
      });
    }

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
      landing_page: config.landing_page
    };

    // ===================================
    // BUILD DESTINATION
    // ===================================

    let finalUrl = config.url;

    // ===================================
    // APPEND UTMs (handles # correctly)
    // ===================================

    const cleanParams = Object.entries(utm)
      .filter(([_, value]) => value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const paramString = new URLSearchParams(cleanParams).toString();

    if (paramString) {
      const hasHash = finalUrl.includes("#");

      if (hasHash) {
        const [baseUrl, hash] = finalUrl.split("#");
        finalUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${paramString}#${hash}`;
      } else {
        finalUrl += finalUrl.includes("?")
          ? `&${paramString}`
          : `?${paramString}`;
      }
    }

    // ===================================
    // SEND TO N8N
    // ===================================

    await fetch("https://dashtraq.app.n8n.cloud/webhook/marketing_data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        club: config.location_id,
        client: "wisper",
        slug: slug || null,
        utm,
        timestamp: Date.now()
      })
    });

    return res.redirect(302, finalUrl);

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
