import { createRoot } from "react-dom/client";

import slides from "../slides.md";
import { Deck } from "./deck/Deck";
import "./deck/deck.css";
import "./demos/demos.css";

// No <StrictMode>: the streaming demos hand a one-shot ReadableStream to the
// libraries, which StrictMode's double effects would consume twice.
createRoot(document.getElementById("root")!).render(<Deck slides={slides} />);
