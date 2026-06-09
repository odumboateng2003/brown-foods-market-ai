import { createFileRoute } from "@tanstack/react-router";
import { usePublishedOrDefault } from "@/lib/site-content";
import { RichText } from "@/components/rich-text";
import { BackToStore } from "@/components/back-to-store";

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
  const v = usePublishedOrDefault("privacy");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BackToStore className="mb-6" />
      <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">{v.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB")}</p>
      <div className="mt-8">
        <RichText text={v.body} />
      </div>
      <div className="mt-10"><BackToStore /></div>
    </div>
  );
}
