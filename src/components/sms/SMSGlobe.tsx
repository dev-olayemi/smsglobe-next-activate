import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Globe,
  Zap,
  Shield,
  Search,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { smsService } from '@/services/sms-service';
import { smsSessionService } from '@/services/sms-session-service';
import { flagService } from '@/services/flag-service';
import { Service, Country, SMSNumber, UserSession } from '@/types/sms-types';
import { ActiveNumbers } from './ActiveNumbers';
import { OrderHistory } from './OrderHistory';
import { toast } from 'sonner';

export const SMSGlobe: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Array<Service & { finalPrice: number; rentalPrices: Record<string, number> }>>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [activeNumbers, setActiveNumbers] = useState<SMSNumber[]>([]);

  // Selection states
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<'one-time' | '3' | '7' | '30'>('one-time');
  const [searchService, setSearchService] = useState('');
  const [searchCountry, setSearchCountry] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadActiveNumbers();
    
    // Initialize polling for existing orders
    if (user) {
      smsService.initializePolling(user.uid);
    }

    // Cleanup on unmount
    return () => {
      smsService.cleanup();
    };
  }, [user]);

  // Auto-refresh active numbers
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveNumbers();
      smsSessionService.cleanupExpiredNumbers();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [servicesData, countriesData] = await Promise.all([
        smsService.getServices(),
        smsService.getCountries()
      ]);
      
      setServices(servicesData);
      setCountries(countriesData);
    } catch (err) {
      setError('Failed to load SMS services');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveNumbers = () => {
    setActiveNumbers(smsSessionService.getActiveNumbers());
  };

  // Get country flag using flag service
  const getCountryFlag = (countryCode: string) => {
    return flagService.getFlagUrl(countryCode);
  };

  // Get emoji flag as fallback
  const getEmojiFlag = (countryCode: string) => {
    return flagService.getEmojiFlag(countryCode);
  };

  // Get service icon (using simple emoji mapping)
  const getServiceIcon = (serviceName: string) => {
    const iconMap: Record<string, string> = {
      'WhatsApp': '💬',
      'Telegram': '✈️',
      'Discord': '🎮',
      'Instagram': '📷',
      'Facebook': '👥',
      'Twitter': '🐦',
      'Google': '🔍',
      'Amazon': '📦',
      'Apple': '🍎',
      'Microsoft': '🪟',
      'Netflix': '🎬',
      'Spotify': '🎵',
      'TikTok': '🎭',
      'LinkedIn': '💼',
      'Uber': '🚗',
      'PayPal': '💳',
      'Steam': '🎮',
      'GitHub': '👨‍💻',
      'Dropbox': '📁',
      'Zoom': '📹',
      'Snapchat': '👻',
      'Pinterest': '📌',
      'Reddit': '🤖',
      'Twitch': '🎮',
      'YouTube': '📺',
      'Skype': '📞',
      'Viber': '📱',
      'WeChat': '💬',
      'Line': '💚',
      'KakaoTalk': '💛'
    };
    
    return iconMap[serviceName] || '🔗';
  };

  // Calculate price based on selection
  const calculatePrice = () => {
    if (!selectedService) return 0;
    
    const service = services.find(s => s.name === selectedService);
    if (!service) return 0;

    if (selectedDuration === 'one-time') {
      return service.finalPrice;
    } else {
      return (service.rentalPrices[selectedDuration] || 0) / 100;
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!user || !selectedService || !selectedCountry) {
      toast.error('Please complete all selections');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await smsService.orderNumber({
        service: selectedService,
        country: selectedCountry,
        type: selectedDuration === 'one-time' ? 'one-time' : 'rental',
        rentalDuration: selectedDuration === 'one-time' ? undefined : parseInt(selectedDuration)
      }, user.uid);

      if (result.success) {
        toast.success('SMS number ordered successfully!');
        // Reset selections
        setSelectedService('');
        setSelectedCountry('');
        setSelectedDuration('one-time');
        loadActiveNumbers();
      } else {
        setError(result.error || 'Failed to order number');
        toast.error(result.error || 'Failed to order number');
      }
    } catch (err) {
      setError('Failed to order number');
      toast.error('Failed to order number');
      console.error('Error ordering number:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter services and countries
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchService.toLowerCase())
  );

  const filteredCountries = countries.filter(country =>
    country.country.toLowerCase().includes(searchCountry.toLowerCase()) ||
    country.iso2.toLowerCase().includes(searchCountry.toLowerCase())
  );

  // Duration options
  const durationOptions = [
    { value: 'one-time', label: '20 minutes', description: 'One-time use', icon: Zap },
    { value: '3', label: '3 days', description: 'Short rental', icon: Clock },
    { value: '7', label: '1 week', description: 'Medium rental', icon: Clock },
    { value: '30', label: '1 month', description: 'Long rental', icon: Clock }
  ];

  const selectedServiceData = services.find(s => s.name === selectedService);
  const selectedCountryData = countries.find(c => c.iso2 === selectedCountry);
  const price = calculatePrice();

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading SMS services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">SMS Globe</h1>
        <p className="text-sm sm:text-base text-gray-600 px-4">Virtual SMS numbers for verification and communication</p>
        
        {/* Features */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 mt-4">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            <span>Instant Activation</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            <span>Global Coverage</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            <span>Secure & Private</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 mx-2 sm:mx-0">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="buy" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Buy Number</span>
            <span className="sm:hidden">Buy</span>
          </TabsTrigger>
          <TabsTrigger value="active" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Active Numbers ({activeNumbers.length})</span>
            <span className="sm:hidden">Active ({activeNumbers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Order History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <Card className="w-full mx-2 sm:mx-0">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                SMS Number Activation
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Simple 4-step process: Select Service → Select Country → Choose Duration → Purchase
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
              {/* Step 1: Select Service */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium">
                    1
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base">Select Service</h3>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                  <Input
                    placeholder="Search services..."
                    value={searchService}
                    onChange={(e) => setSearchService(e.target.value)}
                    className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>

                <ScrollArea className="h-40 sm:h-48 border rounded-lg p-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {filteredServices.map((service) => (
                      <Button
                        key={service.name}
                        variant={selectedService === service.name ? 'default' : 'outline'}
                        className="h-auto p-2 sm:p-3 flex flex-col items-center gap-1 sm:gap-2 text-xs"
                        onClick={() => setSelectedService(service.name)}
                        disabled={loading}
                      >
                        <img
                          src={`https://logo.clearbit.com/${service.name.toLowerCase().replace(/\s+/g, '')}.com`}
                          alt={service.name}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const emoji = target.nextElementSibling as HTMLSpanElement;
                            if (emoji) {
                              emoji.style.display = 'inline';
                              emoji.textContent = getServiceIcon(service.name);
                            }
                          }}
                        />
                        <span className="text-base sm:text-lg" style={{ display: 'none' }}></span>
                        <span className="font-medium text-center leading-tight">{service.name}</span>
                        <span className="text-muted-foreground">${service.finalPrice}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Step 2: Select Country */}
              {selectedService && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium">
                      2
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">Select Country</h3>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                    <Input
                      placeholder="Search countries..."
                      value={searchCountry}
                      onChange={(e) => setSearchCountry(e.target.value)}
                      className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                    />
                  </div>

                  <ScrollArea className="h-40 sm:h-48 border rounded-lg p-2">
                    <div className="space-y-1">
                      {filteredCountries.map((country) => (
                        <Button
                          key={country.iso2}
                          variant={selectedCountry === country.iso2 ? 'default' : 'ghost'}
                          className="w-full justify-start h-auto p-2 sm:p-3 text-xs sm:text-sm"
                          onClick={() => setSelectedCountry(country.iso2)}
                          disabled={loading}
                        >
                          <img
                            src={getCountryFlag(country.iso2)}
                            alt={`${country.country} flag`}
                            className="w-4 h-3 sm:w-6 sm:h-4 mr-2 sm:mr-3 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const emoji = target.nextElementSibling as HTMLSpanElement;
                              if (emoji) {
                                emoji.textContent = getEmojiFlag(country.iso2);
                                emoji.style.display = 'inline';
                              }
                            }}
                          />
                          <span className="text-sm sm:text-base mr-2 sm:mr-3" style={{ display: 'none' }}></span>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{country.country}</div>
                            <div className="text-xs text-muted-foreground">{country.iso2}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Step 3: Select Duration */}
              {selectedService && selectedCountry && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium">
                      3
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">Select Duration</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {durationOptions.map((option) => {
                      const isSelected = selectedDuration === option.value;
                      const optionPrice = option.value === 'one-time' 
                        ? selectedServiceData?.finalPrice || 0
                        : (selectedServiceData?.rentalPrices[option.value] || 0) / 100;

                      return (
                        <Button
                          key={option.value}
                          variant={isSelected ? 'default' : 'outline'}
                          className="h-auto p-3 sm:p-4 flex flex-col items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                          onClick={() => setSelectedDuration(option.value as any)}
                          disabled={loading}
                        >
                          <option.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium">{option.label}</span>
                          <span className="text-muted-foreground text-center">{option.description}</span>
                          <span className="text-sm sm:text-base font-bold text-green-600">${optionPrice.toFixed(2)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Review & Purchase */}
              {selectedService && selectedCountry && (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium">
                      4
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">Review & Purchase</h3>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Service:</span>
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://logo.clearbit.com/${selectedService.toLowerCase().replace(/\s+/g, '')}.com`}
                          alt={selectedService}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const emoji = target.nextElementSibling as HTMLSpanElement;
                            if (emoji) {
                              emoji.style.display = 'inline';
                              emoji.textContent = getServiceIcon(selectedService);
                            }
                          }}
                        />
                        <span className="text-sm sm:text-base" style={{ display: 'none' }}></span>
                        <span className="font-medium text-sm sm:text-base">{selectedService}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Country:</span>
                      <div className="flex items-center gap-2">
                        <img
                          src={getCountryFlag(selectedCountry)}
                          alt={`${selectedCountryData?.country} flag`}
                          className="w-4 h-3 sm:w-6 sm:h-4 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const emoji = target.nextElementSibling as HTMLSpanElement;
                            if (emoji) {
                              emoji.textContent = getEmojiFlag(selectedCountry);
                              emoji.style.display = 'inline';
                            }
                          }}
                        />
                        <span className="text-sm sm:text-base" style={{ display: 'none' }}></span>
                        <span className="font-medium text-sm sm:text-base">{selectedCountryData?.country}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Duration:</span>
                      <span className="font-medium text-sm sm:text-base">
                        {durationOptions.find(opt => opt.value === selectedDuration)?.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold text-sm sm:text-base">Total Price:</span>
                      <span className="text-lg sm:text-xl font-bold text-green-600">${price.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePurchase}
                    disabled={loading}
                    className="w-full text-sm sm:text-base"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Purchase SMS Number
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-4 sm:mt-6">
          <ActiveNumbers 
            numbers={activeNumbers}
            onRefresh={loadActiveNumbers}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4 sm:mt-6">
          <OrderHistory userId={user?.uid} />
        </TabsContent>
      </Tabs>
    </div>
  );
};