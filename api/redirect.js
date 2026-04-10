export default async function handler(req, res) {
  try {
    const { client, location_id, slug, ...query } = req.query;

    // ===================================
    // SUPPORT BOTH client AND location_id
    // ===================================

    const CLIENTS = {
      wisper: {
        location_id: 8005,
        landing_page: "request-a-quote",
        url: "https://wisperisp.com/request-a-quote/#form"
      }
    };

    let config;

    if (client) {
      config = CLIENTS[String(client).toLowerCase()];
      if (!config) {
        return res.status(400).json({
          ok: false,
          error: "Unknown client"
        });
      }
    } else if (location_id) {
      // allow direct location usage (future-proof)
      config = {
        location_id: Number(location_id),
        landing_page: slug || "unknown",
        url: "https://wisperisp.com/request-a-quote/#form"
      };
    } else {
      return res.status(400).json({
        ok: false,
        error: "Missing client or location_id"
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
      landing_page: slug || config.landing_page
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
        location_id: config.location_id,
        client: client || null,
        slug: slug || config.landing_page,
        utm,
        timestamp: new Date().toISOString()
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
