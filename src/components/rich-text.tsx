/**
 * Lightweight renderer for plain-text content edited in the CMS.
 * - Blank line = paragraph break
 * - Lines starting with "- " become bullet list items
 * - Lines starting with a digit + "." are rendered as section headings
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className="prose prose-neutral max-w-none text-foreground">
      {blocks.map((raw, i) => {
        const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        const bulletLines = lines.filter((l) => l.startsWith("- "));
        if (bulletLines.length === lines.length) {
          return (
            <ul key={i}>
              {bulletLines.map((l, j) => <li key={j}>{l.replace(/^- /, "")}</li>)}
            </ul>
          );
        }
        const [first, ...rest] = lines;
        if (/^\d+\.\s/.test(first)) {
          return (
            <div key={i}>
              <h2 className="font-display text-2xl font-bold">{first.replace(/^\d+\.\s*/, "")}</h2>
              {rest.length > 0 && <p>{rest.join(" ")}</p>}
            </div>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
