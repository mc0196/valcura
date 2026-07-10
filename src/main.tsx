import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createStore } from "./store/store";

const store = createStore(window.localStorage);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
