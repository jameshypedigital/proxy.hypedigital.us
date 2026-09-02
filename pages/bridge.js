export default function BridgePage() {
  return null;
}

export async function getServerSideProps(context) {
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
    } = context.query;

    // ===================================
    // CLEAN QUERY VALUES
    // ===================================

    const cleanValue = (value) => {
      if (Array.isArray(value)) {
        return value[0] || null;
      }

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      return String(value);
    };

    const finalLpurl = cleanValue(lpurl);
    const finalClient = cleanValue(client);
    const finalLocationId = cleanValue(location_id);
    const finalSlug = cleanValue(slug);

    // ===================================
    // CLIENT CONFIG
    // ===================================

    const CLIENTS = {
      wisper: {
        location_id: 8005,
        landing_page: "request-a-quote"
      }
    };

    let resolvedLocationId = finalLocationId;
    let resolvedSlug = finalSlug;

    // If client is supplied, use configured defaults
    if (finalClient) {
      const config = CLIENTS[finalClient.toLowerCase()];

      if (!config) {
        console.error("Unknown client:", finalClient);

        return {
          notFound: true
        };
      }

      resolvedLocationId =
        resolvedLocationId ||
        String(config.location_id);

      resolvedSlug =
        resolvedSlug ||
        config.landing_page;
    }

    // ===================================
    // REQUIRE GOOGLE TRANSPARENT URL
    // ===================================

    if (!finalLpurl) {
      console.error("Missing lpurl");

      return {
        notFound: true
      };
    }

    // ===================================
    // VALIDATE LPURL
    // ===================================

    try {
      const destination = new URL(finalLpurl);

      if (
        destination.protocol !== "https:" &&
        destination.protocol !== "http:"
      ) {
        throw new Error("Invalid lpurl protocol");
      }

    } catch (err) {
      console.error("Invalid lpurl:", finalLpurl);

      return {
        notFound: true
      };
    }

    // ===================================
    // NORMALIZE GOOGLE ATTRIBUTION
    // ===================================

    const utm = {
      utm_source: cleanValue(utm_source) || "google",
      utm_medium: cleanValue(utm_medium) || "cpc",
      utm_campaign: cleanValue(utm_campaign),
      utm_content: cleanValue(utm_content),
      utm_term: cleanValue(utm_term),
      utm_adgroup: cleanValue(utm_adgroup),
      utm_adid: cleanValue(utm_adid),
      gclid: cleanValue(gclid),
      landing_page: resolvedSlug
    };

    // ===================================
    // SEND TO N8N
    // Same destination webhook as redirect.js
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

            client: finalClient || null,

            slug: resolvedSlug,

            utm,

            lpurl: finalLpurl,

            source: "google",

            other_params: otherParams,

            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        console.error(
          "n8n tracking returned status:",
          response.status
        );
      }

    } catch (trackingError) {
      // Tracking failure should never block the visitor
      console.error(
        "Google tracking failed:",
        trackingError
      );
    }

    // ===================================
    // GOOGLE TRANSPARENT REDIRECT
    //
    // lpurl controls destination.
    // location_id + slug are tracking metadata.
    // ===================================

    return {
      redirect: {
        destination: finalLpurl,
        permanent: false
      }
    };

  } catch (err) {
    console.error("Bridge fatal error:", err);

    return {
      notFound: true
    };
  }
}
