import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { BrandingEffect } from "@/components/branding-effect";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page wandered off to the market.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-spice px-5 py-2.5 text-sm font-semibold text-spice-foreground shadow-warm hover:brightness-110"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-lg bg-spice px-4 py-2 text-sm font-medium text-spice-foreground shadow-warm hover:brightness-110"
          >
            Try again
          </button>
          <a href="/" className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered" },
      { name: "description", content: "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana." },
      { property: "og:title", content: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered" },
      { property: "og:description", content: "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered" },
      { name: "twitter:description", content: "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3HXKSArNcpfGQfWnFylQMC3n8Vr2/social-images/social-1778497916603-ChatGPT_Image_May_11,_2026,_11_11_34_AM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3HXKSArNcpfGQfWnFylQMC3n8Vr2/social-images/social-1778497916603-ChatGPT_Image_May_11,_2026,_11_11_34_AM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1"><Outlet /></main>
        <SiteFooter />
      </div>
      <ChatWidget />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
