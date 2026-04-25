import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GENERATOR" },
      { name: "description", content: "GENERATOR" },
    ],
  }),
  component: Generator,
});

function Generator() {
  return <main className="min-h-screen bg-white" />;
}
