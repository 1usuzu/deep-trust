import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";

const AdminPage = () => {
  const {
    isAdmin, addCandidate, isLoading, votingOpen,
    closeVoting, openVoting, currentVotingAddress
  } = useContext(VotingContext);
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState("");
  const [candidateAddress, setCandidateAddress] = useState("");

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!candidateName || !candidateAddress) return alert("Nhap day du thong tin ung vien!");
    addCandidate(candidateName, candidateAddress);
    setCandidateName("");
    setCandidateAddress("");
  };

  if (!currentVotingAddress) {
    return (
      <div className="page-message">
        <h2>Chua chon cuoc bau chon</h2>
        <button className="btn btn-outline" onClick={() => navigate("/select-voting")}>Chon bau chon</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-message">
        <h2>Dang xu ly...</h2>
        <p>Xac nhan giao dich tren MetaMask va cho doi.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-message">
        <h2>Truy cap bi tu choi</h2>
        <p>Chi Admin moi co quyen quan ly.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h2>Trang Quan Tri</h2>

      <div className={`voting-status-box ${votingOpen ? "open" : "closed"}`}>
        <h3>Trang thai bau cu: {votingOpen ? "DANG MO" : "DA DONG"}</h3>
        <p>{votingOpen ? "Cu tri co the bo phieu" : "Cu tri khong the bo phieu"}</p>
        <button
          className={`btn ${votingOpen ? "btn-danger" : "btn-success"}`}
          onClick={votingOpen ? closeVoting : openVoting}
          disabled={isLoading}
        >
          {votingOpen ? "Dong Bau Cu" : "Mo Bau Cu"}
        </button>
      </div>

      <div className="admin-form">
        <h3>Them Ung Vien Moi</h3>
        <form onSubmit={handleAddCandidate}>
          <div className="form-group">
            <label>Ten ung vien:</label>
            <input
              type="text"
              placeholder="Nguyen Van A"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Dia chi vi (MetaMask):</label>
            <input
              type="text"
              placeholder="0x..."
              value={candidateAddress}
              onChange={(e) => setCandidateAddress(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Dia chi vi phai bat dau bang 0x va co 42 ky tu"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Dang xu ly..." : "Them Ung Vien"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
