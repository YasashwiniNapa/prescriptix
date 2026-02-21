import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// bootstrap the react app into the root node
const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}
createRoot(rootElement).render(<App />);
