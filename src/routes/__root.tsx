import mainCssUrl from "../styles/main.css?url";
import mantineCoreCss from "@mantine/core/styles.layer.css?url";
import mantineDatesCss from "@mantine/dates/styles.layer.css?url";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ledger" },
    ],
    links: [
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: mantineCoreCss },
      { rel: "stylesheet", href: mantineDatesCss },
      { rel: "stylesheet", href: mainCssUrl },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Outlet />
    </MantineProvider>
  );
}
