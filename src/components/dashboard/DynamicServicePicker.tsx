import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { getServiceLogo, getCountryData } from "@/lib/service-data";
import { toast } from "sonner";

interface Service {
  code: string;
  name: string;
}

interface Country {
  code: number;
  name: string;
  count: number;
  price: number;
}

interface DynamicServicePickerProps {
  onBuyNumber: (service: string, country: string, price: number, type: string, days?: number) => Promise<void>;
  activationType: string;
}

export const DynamicServicePicker = ({ onBuyNumber, activationType }: DynamicServicePickerProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [service, setService] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [searchService, setSearchService] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [rentalDays, setRentalDays] = useState("7");

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (service) {
      loadCountries();
    }
  }, [service]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sms-services");
      if (error) throw error;
      
      // Convert all services from the API response
      if (data) {
        const allServices = data.map((item: any) => ({
          code: item.code,
          name: item.name
        }));
        setServices(allServices);
      }
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    }
  };

  const loadCountries = async () => {
    if (!service) return;
    
    setLoadingCountries(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-countries", {
        body: { service },
      });
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error("Error loading countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleBuy = async () => {
    if (!service || !country) return;
    
    const selectedCountry = countries.find((c) => c.code.toString() === country);
    let basePrice = selectedCountry?.price || 0;
    
    // Adjust base price based on type
    if (activationType === "rental") {
      basePrice = basePrice * parseInt(rentalDays) * 5; // Example: 5x daily rate
    } else if (activationType === "voice") {
      basePrice = basePrice * 1.5; // 50% more for voice
    }
    
    // Apply 15% markup for profit
    const finalPrice = Number((basePrice * 1.15).toFixed(2));
    
    setLoading(true);
    try {
      await onBuyNumber(service, country, finalPrice, activationType, activationType === "rental" ? parseInt(rentalDays) : undefined);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchCountry.toLowerCase())
  );

  const selectedCountry = countries.find((c) => c.code.toString() === country);
  const selectedService = services.find((s) => s.code === service);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service">Select Service</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search services..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              className="pl-9 mb-2"
            />
          </div>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger id="service" className="h-12">
              <SelectValue placeholder="Choose a service">
                {service && selectedService && (
                  <div className="flex items-center gap-3">
                    <img 
                      src={getServiceLogo(service)} 
                      alt={selectedService.name}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-background border shadow-lg z-50">
              {filteredServices.map((s) => (
                <SelectItem key={s.code} value={s.code} className="cursor-pointer">
                  <div className="flex items-center gap-3 py-1">
                    <img 
                      src={getServiceLogo(s.code)} 
                      alt={s.name}
                      className="h-6 w-6 object-contain"
                    />
                    <span>{s.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {service && (
          <div className="space-y-2">
            <Label htmlFor="country">Select Country</Label>
            {loadingCountries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Search countries..."
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    className="pl-9 mb-2"
                  />
                </div>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" className="h-12">
                    <SelectValue placeholder="Choose a country">
                      {country && selectedCountry && (
                        <div className="flex items-center gap-3">
                          <img 
                            src={getCountryData(country).flag}
                            alt={selectedCountry.name}
                            className="h-6 w-8 object-cover rounded"
                          />
                          <span className="font-medium">{selectedCountry.name}</span>
                          <span className="ml-auto text-sm text-muted-foreground">
                            ${(selectedCountry.price * 1.15).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-background border shadow-lg z-50">
                    {filteredCountries.map((c) => (
                      <SelectItem key={c.code} value={c.code.toString()} className="cursor-pointer">
                        <div className="flex items-center gap-3 w-full py-1">
                          <img 
                            src={getCountryData(c.code.toString()).flag}
                            alt={c.name}
                            className="h-6 w-8 object-cover rounded"
                          />
                          <span className="flex-1">{c.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {c.count} available
                          </span>
                          <span className="text-sm font-medium">
                            ${(c.price * 1.15).toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )}

        {activationType === "rental" && selectedCountry && (
          <div className="space-y-2">
            <Label htmlFor="rental-days">Rental Period</Label>
            <Select value={rentalDays} onValueChange={setRentalDays}>
              <SelectTrigger id="rental-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="7">7 days - ${(selectedCountry.price * 7 * 5 * 1.15).toFixed(2)}</SelectItem>
                <SelectItem value="14">14 days - ${(selectedCountry.price * 14 * 5 * 1.15).toFixed(2)}</SelectItem>
                <SelectItem value="30">30 days - ${(selectedCountry.price * 30 * 5 * 1.15).toFixed(2)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCountry && (
          <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-secondary/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">{activationType}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available:</span>
              <span className="font-medium">{selectedCountry.count} numbers</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Price:</span>
              <span className="text-2xl font-bold text-primary">
                ${activationType === "rental" 
                  ? (selectedCountry.price * parseInt(rentalDays) * 5 * 1.15).toFixed(2)
                  : activationType === "voice"
                  ? (selectedCountry.price * 1.5 * 1.15).toFixed(2)
                  : (selectedCountry.price * 1.15).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={handleBuy}
          className="w-full"
          size="lg"
          disabled={!service || !country || loading || loadingCountries}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedCountry ? "Get Number Now" : "Select Service & Country"}
        </Button>
      </div>
    </div>
  );
};
