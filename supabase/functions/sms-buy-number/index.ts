import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { service, country, type, rental_days: days, operator, price } = await req.json();
    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    // Deduct price from user's balance first
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance, cashback, use_cashback_first")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const totalBalance = (profile.use_cashback_first ? profile.cashback : 0) + profile.balance;
    if (totalBalance < price) {
      throw new Error("Insufficient balance");
    }

    let url = `${BASE_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country}`;
    if (operator) {
      url += `&operator=${operator}`;
    }

    const response = await fetch(url);
    const responseData = await response.text();

    console.log("Buy number response:", responseData);

    if (responseData.startsWith("ACCESS_NUMBER")) {
      const parts = responseData.split(":");
      const activationId = parts[1];
      const phoneNumber = parts[2];

      // Deduct from balance
      let amountFromCashback = 0;
      let amountFromBalance = price;

      if (profile.use_cashback_first && profile.cashback > 0) {
        amountFromCashback = Math.min(profile.cashback, price);
        amountFromBalance = price - amountFromCashback;
      }

      const newCashback = profile.cashback - amountFromCashback;
      const newBalance = profile.balance - amountFromBalance;

      await supabase
        .from("profiles")
        .update({ 
          balance: newBalance,
          cashback: newCashback 
        })
        .eq("id", user.id);

      // Save activation to database
      const { data: activation, error } = await supabase
        .from("activations")
        .insert({
          user_id: user.id,
          activation_id: activationId,
          phone_number: phoneNumber,
          service,
          country_code: parseInt(country),
          country_name: getCountryName(parseInt(country)),
          operator: operator || null,
          activation_type: type || "standard",
          rental_days: days || null,
          is_voice: type === "voice",
          price: price,
          status: "waiting",
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create transaction record
      await supabase
        .from("balance_transactions")
        .insert({
          user_id: user.id,
          type: "purchase",
          amount: -price,
          balance_after: newBalance,
          description: `Purchased ${service} number for ${getCountryName(parseInt(country))}`,
        });

      return new Response(
        JSON.stringify(activation),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      throw new Error(responseData);
    }
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
    9: "Tanzania",
    10: "Vietnam",
    11: "Kyrgyzstan",
    12: "USA",
    13: "Israel",
    14: "HongKong",
    15: "Poland",
    16: "England",
    17: "Madagascar",
    18: "DRC",
    19: "Nigeria",
    20: "Macao",
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
    41: "Cameroon",
    42: "Chad",
    43: "Germany",
    44: "Lithuania",
    45: "Croatia",
    46: "Sweden",
    47: "Iraq",
    48: "Netherlands",
    49: "Latvia",
    50: "Austria",
    51: "Belarus",
    52: "Thailand",
    53: "Saudi Arabia",
    54: "Mexico",
    55: "Taiwan",
    56: "Spain",
    57: "Iran",
    58: "Algeria",
    59: "Slovenia",
    60: "Bangladesh",
    61: "Senegal",
    62: "Turkey",
    63: "Czech",
    64: "Sri Lanka",
    65: "Peru",
    66: "Pakistan",
    67: "NewZealand",
    68: "Guinea",
    69: "Mali",
    70: "Venezuela",
    71: "Ethiopia",
    72: "Mongolia",
    73: "Brazil",
    74: "Afghanistan",
    75: "Uganda",
    76: "Angola",
    77: "Cyprus",
    78: "France",
    79: "Papua New Guinea",
    80: "Mozambique",
    81: "Nepal",
    82: "Belgium",
    83: "Bulgaria",
    84: "Hungary",
    85: "Moldova",
    86: "Italy",
    87: "Paraguay",
    88: "Honduras",
    89: "Tunisia",
    90: "Nicaragua",
    91: "Timor-Leste",
    92: "Bolivia",
    93: "Costa Rica",
    94: "Guatemala",
    95: "UAE",
    96: "Zimbabwe",
    97: "PuertoRico",
    98: "Sudan",
    99: "Togo",
    100: "Kuwait",
    101: "Salvador",
    102: "Libya",
    103: "Jamaica",
    104: "Trinidad and Tobago",
    105: "Ecuador",
    106: "Swaziland",
    107: "Oman",
    108: "Bosnia and Herzegovina",
    109: "Dominican",
    110: "Syria",
    111: "Qatar",
    112: "Panama",
    113: "Cuba",
    114: "Mauritania",
    115: "SierraLeone",
    116: "Jordan",
    117: "Portugal",
    118: "Barbados",
    119: "Burundi",
    120: "Benin",
    121: "Brunei",
    122: "Bahamas",
    123: "Botswana",
    124: "Belize",
    125: "CentralAfrican",
    126: "Dominica",
    127: "Grenada",
    128: "Georgia",
    129: "Greece",
    130: "Guyana",
    131: "Guadeloupe",
    132: "Luxemburg",
    133: "Mauritius",
    134: "Maldives",
    135: "Malawi",
    136: "Namibia",
    137: "Niger",
    138: "Rwanda",
    139: "Slovakia",
    140: "Suriname",
    141: "Tajikistan",
    142: "Monaco",
    143: "Bahrain",
    144: "Reunion",
    145: "Zambia",
    146: "Armenia",
    147: "Somalia",
    148: "Congo",
    149: "Chile",
    150: "BurkinaFaso",
    151: "Lebanon",
    152: "Gabon",
    153: "Albania",
    154: "Uruguay",
    155: "Mauritania",
    156: "Bhutan",
    157: "Maldives",
    158: "Guadeloupe",
    159: "Turkmenistan",
    160: "Guam",
    161: "Martinique",
    162: "Curacao",
    163: "Aruba",
    164: "Fiji",
    165: "CapVerde",
    166: "Palau",
    167: "FrenchGuiana",
    168: "Palestine",
    169: "Faroe Islands",
    170: "Montenegro",
    171: "Macedonia",
    172: "Papua",
    173: "CaymanIslands",
    174: "Liechtenstein",
    175: "SaintLucia",
    176: "Seychelles",
    177: "Andorra",
    178: "Antigua",
    179: "Samoa",
    180: "DominicanRepublic",
    181: "Iceland",
    182: "SaintVincentAndTheGrenadines",
    183: "Finland",
    184: "Denmark",
    185: "Switzerland",
    186: "Japan",
    187: "Australia",
    188: "Singapore",
  };
  return countries[code] || `Country ${code}`;
}
