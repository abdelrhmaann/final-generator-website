import { createFileRoute } from "@tanstack/react-router";
import AtsPage from "../../client/src/pages/AtsPage";

export const Route = createFileRoute("/ats")({
  head: () => ({ meta: [{ title: "ATS — GENERATOR" }] }),
  component: AtsPage,
});