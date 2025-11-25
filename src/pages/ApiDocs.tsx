import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ApiDocs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">API Documentation</h1>
            <p className="text-lg text-muted-foreground">
              Complete guide to integrating SMSGlobe into your application
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="auth" className="border rounded-lg bg-card px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left">
                  <h3 className="font-semibold">Authentication</h3>
                  <p className="text-sm text-muted-foreground">Get your API key and authenticate requests</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <p>All API requests require authentication using your API key.</p>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>
                <p>You can find your API key in your dashboard settings.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="balance" className="border rounded-lg bg-card px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left">
                  <h3 className="font-semibold">Get Balance</h3>
                  <p className="text-sm text-muted-foreground">GET /api/balance</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <p>Retrieve your current account balance and cashback.</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "balance": "10.50",
  "cashback": "2.30"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="buy" className="border rounded-lg bg-card px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left">
                  <h3 className="font-semibold">Buy Number</h3>
                  <p className="text-sm text-muted-foreground">POST /api/activations</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <p>Purchase a new virtual number for SMS verification.</p>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <pre className="text-sm overflow-x-auto">
{`{
  "service": "wa",
  "country": "0",
  "operator": "mts"
}`}
                  </pre>
                </div>
                <p>Response:</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "activation_id": "123456789",
  "phone_number": "+79001234567",
  "service": "wa",
  "country": "0",
  "status": "waiting"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="status" className="border rounded-lg bg-card px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left">
                  <h3 className="font-semibold">Get SMS Status</h3>
                  <p className="text-sm text-muted-foreground">GET /api/activations/:id</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <p>Check the status of an activation and retrieve SMS codes.</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "activation_id": "123456789",
  "status": "completed",
  "sms_code": "123456",
  "sms_text": "Your verification code is: 123456"
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cancel" className="border rounded-lg bg-card px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left">
                  <h3 className="font-semibold">Cancel Activation</h3>
                  <p className="text-sm text-muted-foreground">DELETE /api/activations/:id</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <p>Cancel an active number and receive a refund if SMS wasn't received.</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "success": true,
  "refunded": true
}`}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ApiDocs;
