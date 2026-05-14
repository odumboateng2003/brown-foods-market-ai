import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — BROWN Foods Market" },
      { name: "description", content: "The terms that govern your use of the BROWN Foods Market platform." },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB")}</p>

      <div className="prose prose-neutral mt-8 max-w-none text-foreground">
        <h2>1. Acceptance of terms</h2>
        <p>By using BROWN Foods Market, you agree to these Terms &amp; Conditions and our Privacy Policy.</p>

        <h2>2. Development status</h2>
        <p>The platform is currently in active development. Live payments are temporarily disabled and no real transactions will be processed until the admin enables live payments. Test orders do not constitute a binding sale.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for keeping your login credentials confidential and for all activity under your account.</p>

        <h2>4. Orders &amp; pricing</h2>
        <p>Prices are listed in Ghana Cedis (GHS) and may change without notice. We reserve the right to refuse or cancel any order, including for reasons of stock availability, suspected fraud, or pricing errors.</p>

        <h2>5. Delivery</h2>
        <p>Delivery times depend on your location and product availability. We are not liable for delays caused by events outside our reasonable control.</p>

        <h2>6. Returns</h2>
        <p>Perishable items cannot be returned once delivered. Damaged or incorrect items must be reported within 24 hours of delivery.</p>

        <h2>7. Limitation of liability</h2>
        <p>To the fullest extent permitted by Ghanaian law, BROWN Foods Market is not liable for indirect, incidental, or consequential damages arising from your use of the platform.</p>

        <h2>8. Governing law</h2>
        <p>These terms are governed by the laws of the Republic of Ghana.</p>

        <h2>9. Contact</h2>
        <p>Questions? Email <a href="mailto:support@brownfoodsmarket.com">support@brownfoodsmarket.com</a>.</p>
      </div>
    </div>
  );
}
