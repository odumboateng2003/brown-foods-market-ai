import { createFileRoute } from "@tanstack/react-router";
import { usePublishedOrDefault } from "@/lib/site-content";
import { RichText } from "@/components/rich-text";

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
  const v = usePublishedOrDefault("terms");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{v.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB")}</p>
      <div className="mt-8">
        <RichText text={v.body} />
      </div>
    </div>
  );
}
