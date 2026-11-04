import { routeTree } from "./routeTree.gen";
import { Alert, Container } from "@mantine/core";
import { createRouter } from "@tanstack/react-router";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultErrorComponent: ({ error }) => (
      <Container size="sm" py="xl">
        <Alert color="red" title="Something went wrong">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </Container>
    ),
    defaultNotFoundComponent: () => (
      <Container size="sm" py="xl">
        <Alert title="Not found">This page does not exist.</Alert>
      </Container>
    ),
  });
}
