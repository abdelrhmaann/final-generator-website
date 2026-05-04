import { createFileRoute } from "@tanstack/react-router";
import VentilationPage from "../../client/src/pages/VentilationPage";

export const Route = createFileRoute("/ventilation")({
  head: () => ({ meta: [{ title: "Ventilation — GENERATOR" }] }),
  component: VentilationPage,
});