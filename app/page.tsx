import type { Metadata } from "next";
import ClueAtlasApp from "./ClueAtlasApp";

export const metadata: Metadata = {
  title: "Clue Atlas — Personal Knowledge Gym",
  description:
    "Diagnose your trivia gaps, build durable recall with spaced repetition, and turn every clue into useful learning data.",
};

export default function Home() {
  return <ClueAtlasApp />;
}
