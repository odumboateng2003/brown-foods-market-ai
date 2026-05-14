import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — BROWN Foods Market" },
      { name: "description", content: "BROWN Foods Market connects Ghanaian households with trusted local farmers and authentic foodstuffs delivered to their door." },
      { property: "og:title", content: "About BROWN Foods Market" },
      { property: "og:description", content: "Authentic Ghanaian foodstuffs, sourced from trusted local farmers and delivered nationwide." },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">About BROWN Foods Market</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We are a Ghanaian-owned food marketplace built to make authentic local
        foodstuffs easier to buy, anywhere in the country.
      </p>

      <section className="prose prose-neutral mt-8 max-w-none text-foreground">
        <h2 className="font-display text-2xl font-bold">Our mission</h2>
        <p>
          From Pona yam in Techiman to fresh tilapia from Lake Volta, we partner
          directly with farmers, fishermen and producers to bring quality
          Ghanaian foodstuffs to your home at fair prices.
        </p>

        <h2 className="font-display text-2xl font-bold">What we do</h2>
        <ul>
          <li>Source produce from trusted local suppliers.</li>
          <li>Quality-check every order before it leaves the warehouse.</li>
          <li>Deliver across Greater Accra, Ashanti and beyond.</li>
          <li>Support customers in English, Twi and Ga.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold">Built for Ghana, scaling across Africa</h2>
        <p>
          Our team is currently building and testing the platform. Live payments
          will be enabled soon. In the meantime, you can browse the catalogue,
          create an account, and explore how the marketplace works.
        </p>
      </section>

      <div className="mt-10 flex gap-3">
        <Button asChild variant="hero"><Link to="/shop">Browse the market</Link></Button>
        <Button asChild variant="outline"><Link to="/contact">Contact us</Link></Button>
      </div>
    </div>
  );
}
