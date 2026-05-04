import { createFileRoute } from "@tanstack/react-router";
import VoltageDipPage from "../../client/src/pages/VoltageDipPage";

export const Route = createFileRoute("/voltage-dip")({
  head: () => ({ meta: [{ title: "Voltage Dip — GENERATOR" }] }),
  component: VoltageDipPage,
});