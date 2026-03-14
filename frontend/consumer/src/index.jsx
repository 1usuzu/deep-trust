import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { VotingProvider } from "./context/VotingContext";
import App from "./App.jsx";
import "../../src/index.css";
import "../../src/App.css";
import "../../src/components/WalletConnect.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <VotingProvider>
      <BrowserRouter basename="/consumer">
        <App />
      </BrowserRouter>
    </VotingProvider>
  </React.StrictMode>
);
