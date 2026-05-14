import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — BROWN Foods Market" },
      { name: "description", content: "How BROWN Foods Market collects, uses, and protects your personal information." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB")}</p>

      <div className="prose prose-neutral mt-8 max-w-none text-foreground">
        <h2>1. Information we collect</h2>
        <p>We collect information you provide when you create an account, place an order, or contact support — including your name, email, phone number, delivery address, and order history.</p>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To process and deliver your orders.</li>
          <li>To communicate order status, receipts, and customer support.</li>
          <li>To improve our products, services, and recommendations.</li>
          <li>To comply with Ghanaian legal and tax obligations.</li>
        </ul>

        <h2>3. Payment information</h2>
        <p>The platform is currently in development and live payments are temporarily disabled. When live, payment information will be processed by our licensed payment partners and never stored on our servers.</p>

        <h2>4. Sharing</h2>
        <p>We do not sell your personal data. We share information only with delivery partners and payment processors as needed to fulfill your order, and as required by law.</p>

        <h2>5. Security</h2>
        <p>We use industry-standard encryption, role-based access controls, and secure authentication to protect your account.</p>

        <h2>6. Your rights</h2>
        <p>You may request access, correction, or deletion of your personal data at any time by emailing <a href="mailto:privacy@brownfoodsmarket.com">privacy@brownfoodsmarket.com</a>.</p>

        <h2>7. Contact</h2>
        <p>Questions about this policy? Reach us at <a href="mailto:privacy@brownfoodsmarket.com">privacy@brownfoodsmarket.com</a>.</p>
      </div>
    </div>
  );
}
