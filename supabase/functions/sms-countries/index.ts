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
    const { service } = await req.json();
    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    const response = await fetch(
      `${BASE_URL}?api_key=${API_KEY}&action=getTopCountriesByService&service=${service}&freePrice=true`
    );

    const data = await response.json();

    // Transform to array format
    const countries = Object.values(data).map((country: any) => ({
      code: country.country,
      name: getCountryName(country.country),
      count: country.count,
      price: country.price,
      retail_price: country.retail_price,
    }));

    return new Response(
      JSON.stringify(countries),
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

function getCountryName(code: number): string {
  const countries: { [key: number]: string } = {
    0: "Russia",
    1: "Ukraine",
    2: "Kazakhstan",
    3: "China",
    4: "Philippines",
    5: "Myanmar",
    6: "Indonesia",
    7: "Malaysia",
    8: "Kenya",
    10: "Vietnam",
    11: "Kyrgyzstan",
    12: "USA",
    13: "Israel",
    14: "Hong Kong",
    15: "Poland",
    16: "England",
    17: "Madagascar",
    18: "Congo",
    19: "Nigeria",
    20: "Macau",
    21: "Egypt",
    22: "India",
    23: "Ireland",
    24: "Cambodia",
    25: "Laos",
    26: "Haiti",
    27: "Ivory Coast",
    28: "Gambia",
    29: "Serbia",
    30: "Yemen",
    31: "South Africa",
    32: "Romania",
    33: "Colombia",
    34: "Estonia",
    35: "Azerbaijan",
    36: "Canada",
    37: "Morocco",
    38: "Ghana",
    39: "Argentina",
    40: "Uzbekistan",
  };
  return countries[code] || `Country ${code}`;
}
