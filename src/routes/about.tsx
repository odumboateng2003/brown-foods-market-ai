import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { usePublishedOrDefault } from "@/lib/site-content";
import { BackToStore } from "@/components/back-to-store";

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
  const v = usePublishedOrDefault("about");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BackToStore className="mb-6" />
      <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">{v.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{v.intro}</p>

      <section className="prose prose-neutral mt-8 max-w-none text-foreground">
        <h2 className="font-display text-2xl font-bold">{v.mission_heading}</h2>
        <p>{v.mission_body}</p>

        <h2 className="font-display text-2xl font-bold">{v.what_we_do_heading}</h2>
        <ul>
          {v.what_we_do_items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 className="font-display text-2xl font-bold">{v.outro_heading}</h2>
        <p>{v.outro_body}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="hero"><Link to="/shop">Browse the market</Link></Button>
        <Button asChild variant="outline"><Link to="/contact">Contact us</Link></Button>
      </div>
    </div>
  );
}
