import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Popular services list
    const services = [
      { code: "wa", name: "WhatsApp" },
      { code: "tg", name: "Telegram" },
      { code: "go", name: "Google" },
      { code: "fb", name: "Facebook" },
      { code: "ig", name: "Instagram" },
      { code: "tw", name: "Twitter" },
      { code: "vk", name: "VK" },
      { code: "ok", name: "Odnoklassniki" },
      { code: "vi", name: "Viber" },
      { code: "wb", name: "WeChat" },
      { code: "av", name: "Avito" },
      { code: "ot", name: "OLX" },
      { code: "ub", name: "Uber" },
      { code: "qi", name: "Qiwi" },
      { code: "we", name: "Wechat" },
      { code: "bd", name: "Baidu" },
      { code: "mm", name: "Microsoft" },
      { code: "mb", name: "Mail.ru" },
      { code: "ya", name: "Yandex" },
      { code: "ma", name: "Mail.ru Group" },
    ];

    return new Response(
      JSON.stringify(services),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
