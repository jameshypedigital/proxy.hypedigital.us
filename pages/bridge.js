export default async function handler(req, res) {
  try {
    const {
      lpurl,
      client,
      location_id,
      slug,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utm_adgroup,
      utm_adid,
      gclid,
      ...otherParams
    } = req.query;

    // ===================================
    // REQUIRE LPURL
    // ===================================

    if (!lpurl) {
      return res.status(400).json({
        ok: false,
        error: "Missing lpurl"
      });
    }

    // ===================================
    // VALIDATE LPURL
    // ===================================

    let destination;

    try {
      destination = new URL(lpurl);

      if (
        destination.protocol !== "https:" &&
        destination.protocol !== "http:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: "Invalid lpurl"
      });
    }

    // ===================================
    // RESOLVE LOCATION / CLIENT
    // ===================================

    const CLIENTS = {
      wisper: {
        location_id: 8005,
        landing_page: "request-a-quote"
      }
    };

    let resolvedLocationId = location_id || null;
    let resolvedSlug = slug || null;

    if (client) {
      const config = CLIENTS[String(client).toLowerCase()];

      if (!config) {
        return res.status(400).json({
          ok: false,
          error: "Unknown client"
        });
      }

      resolvedLocationId =
        resolvedLocationId || config.location_id;

      resolvedSlug =
        resolvedSlug || config.landing_page;
    }

    // ===================================
    // NORMALIZE GOOGLE ATTRIBUTION
    // ===================================

    const utm = {
      utm_source: utm_source || "google",
      utm_medium: utm_medium || "cpc",
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      utm_adgroup: utm_adgroup || null,
      utm_adid: utm_adid || null,
      gclid: gclid || null,
      landing_page: resolvedSlug
    };

    // ===================================
    // SEND TO N8N
    // ===================================

    try {
      const response = await fetch(
        "https://dashtraq.app.n8n.cloud/webhook/marketing_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            location_id: resolvedLocationId
              ? Number(resolvedLocationId)
              : null,
            client: client || null,
            slug: resolvedSlug,
            utm,
            lpurl,
            source: "google",
            other_params: otherParams,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        console.error(
          "n8n tracking returned:",
          response.status
        );
      }
    } catch (trackingError) {
      // Tracking failure should NOT block redirect
      console.error(
        "Tracking error:",
        trackingError
      );
    }

    // ===================================
    // TRANSPARENT GOOGLE REDIRECT
    // ===================================

    return res.redirect(302, lpurl);

  } catch (err) {
    console.error("Bridge error:", err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
