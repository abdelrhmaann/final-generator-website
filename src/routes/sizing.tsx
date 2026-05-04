import { createFileRoute } from "@tanstack/react-router";
import SizingPage from "../../client/src/pages/SizingPage";

export const Route = createFileRoute("/sizing")({
  head: () => ({ meta: [{ title: "kVA Sizing — GENERATOR" }] }),
  component: SizingPage,
});