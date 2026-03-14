import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import WelcomePage from "./pages/WelcomePage";
import CreateVotingPage from "./pages/CreateVotingPage";
import SelectVotingPage from "./pages/SelectVotingPage";
import VotePage from "./pages/VotePage";
import ResultsPage from "./pages/ResultsPage";
import AdminPage from "./pages/AdminPage";
import VerifyIdentityPage from "./pages/VerifyIdentityPage";
import "./App.css";

function App() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="app">
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      <Navbar />
      <div className={`main-content ${isHomePage ? "main-content-home" : ""}`}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/create-voting" element={<CreateVotingPage />} />
          <Route path="/select-voting" element={<SelectVotingPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/verify" element={<VerifyIdentityPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
