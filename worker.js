const CONFIG_URL =
"https://raw.githubusercontent.com/probrofinity/Finity-Key-System-/main/config.json";

const corsHeaders = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
"Access-Control-Allow-Headers": "Content-Type, Authorization",
"Content-Type": "application/json; charset=utf-8"
};

function response(data, status = 200) {
return new Response(JSON.stringify(data, null, 2), {
status,
headers: corsHeaders
});
}

async function getConfig() {
const url = CONFIG_URL + "?t=" + Date.now();

const res = await fetch(url, {
headers: { "Cache-Control": "no-cache" }
});

if (!res.ok) {
throw new Error("Could not load config.json from GitHub");
}

return await res.json();
}

export default {
async fetch(request) {
if (request.method === "OPTIONS") {
return new Response(null, {
status: 204,
headers: corsHeaders
});
}

const url = new URL(request.url);
const path = url.pathname;

try {
  if (request.method === "GET" && path === "/") {
    return response({
      success: true,
      name: "Finity Key System",
      status: "running",
      endpoints: [
        "/config",
        "/verify?key=FINITY-VIP-001"
      ]
    });
  }

  if (request.method === "GET" && path === "/config") {
    const config = await getConfig();

    return response({
      success: true,
      enabled: config.enabled,
      app_name: config.app_name,
      get_key_url: config.get_key_url,
      telegram_url: config.telegram_url,
      banned_devices: config.banned_devices || [],
      keys: config.keys || {}
    });
  }

  if (request.method === "GET" && path === "/verify") {
    const key = (url.searchParams.get("key") || "").trim();
    const deviceId = (url.searchParams.get("device_id") || "").trim();

    if (!key) {
      return response({
        success: false,
        valid: false,
        message: "Key is required"
      }, 400);
    }

    const config = await getConfig();

    if (config.enabled !== true) {
      return response({
        success: false,
        valid: false,
        message: "Key system is disabled"
      });
    }

    if (
      deviceId &&
      (config.banned_devices || []).includes(deviceId)
    ) {
      return response({
        success: false,
        valid: false,
        message: "This device is blocked"
      });
    }

    const item = (config.keys || {})[key];

    if (!item) {
      return response({
        success: true,
        valid: false,
        message: "Invalid key"
      });
    }

    const now = Date.now();
    const expiresAt = Number(item.expires_at || 0);
    const savedDeviceId = String(item.device_id || "");

    if (expiresAt > 0 && now > expiresAt) {
      return response({
        success: true,
        valid: false,
        message: "Key expired"
      });
    }

    if (
      savedDeviceId &&
      deviceId &&
      savedDeviceId !== deviceId
    ) {
      return response({
        success: true,
        valid: false,
        message: "Key belongs to another device"
      });
    }

    return response({
      success: true,
      valid: true,
      username: item.username || "Finity User",
      type: item.type || "free",
      created_at: Number(item.created_at || 0),
      expires_at: expiresAt,
      message: "Key verified successfully"
    });
  }

  return response({
    success: false,
    message: "Endpoint not found"
  }, 404);

} catch (error) {
  return response({
    success: false,
    message: "Server error",
    error: error.message
  }, 500);
}

}
};
