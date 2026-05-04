import { createFileRoute } from "@tanstack/react-router";
import FuelPage from "../../client/src/pages/FuelPage";

export const Route = createFileRoute("/fuel")({
  head: () => ({ meta: [{ title: "Fuel — GENERATOR" }] }),
  component: FuelPage,
});