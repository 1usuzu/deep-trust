import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";

const CreateVotingPage = () => {
  const { currentAccount, createVoting, isLoading } = useContext(VotingContext);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vui long nhap ten cuoc bau chon!");
    const ok = await createVoting(title, description);
    if (ok) {
      alert("Tao cuoc bau chon thanh cong!");
      navigate("/select-voting");
    }
  };

  if (!currentAccount) {
    return (
      <div className="page-message">
        <h2>Chua ket noi vi</h2>
        <p>Vui long ket noi MetaMask de tao cuoc bau chon.</p>
        <button className="btn btn-outline" onClick={() => navigate("/")}>Quay lai</button>
      </div>
    );
  }

  return (
    <div className="create-voting-page">
      <h2>Tao Cuoc Bau Chon Moi</h2>
      <p className="desc">Ban se tro thanh quan tri vien cua cuoc bau chon nay</p>

      <form onSubmit={handleSubmit} className="voting-form">
        <div className="form-group">
          <label>Ten cuoc bau chon: <span className="required">*</span></label>
          <input
            type="text"
            placeholder="VD: Bau cu Ban Chap Hanh Lop 2024"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Mo ta (tuy chon):</label>
          <textarea
            placeholder="VD: Cuoc bau cu de chon ra BCH lop nhiem ky 2024-2025"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate("/")} disabled={isLoading}>
            Huy
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Dang tao..." : "Tao Cuoc Bau Chon"}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="tx-pending">
          Dang xu ly giao dich tren blockchain... Xac nhan tren MetaMask va cho doi.
        </div>
      )}
    </div>
  );
};

export default CreateVotingPage;
