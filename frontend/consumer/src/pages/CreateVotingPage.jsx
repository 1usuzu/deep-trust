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
    if (!title.trim()) return alert("Vui lòng nhập tên cuộc bầu chọn!");
    const ok = await createVoting(title, description);
    if (ok) {
      alert("Tạo cuộc bầu chọn thành công!");
      navigate("/select-voting");
    }
  };

  if (!currentAccount) {
    return (
      <div className="page-message">
        <h2>Chưa kết nối ví</h2>
        <p>Vui lòng kết nối MetaMask để tạo cuộc bầu chọn.</p>
        <button className="btn btn-outline" onClick={() => navigate("/")}>Quay lại</button>
      </div>
    );
  }

  return (
    <div className="create-voting-page">
      <h2>Tạo Cuộc Bầu Chọn Mới</h2>
      <p className="desc">Bạn sẽ trở thành quản trị viên của cuộc bầu chọn này</p>

      <form onSubmit={handleSubmit} className="voting-form">
        <div className="form-group">
          <label>Tên cuộc bầu chọn: <span className="required">*</span></label>
          <input
            type="text"
            placeholder="VD: Bầu cử Ban Chấp Hành Lớp 2024"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Mô tả (tùy chọn):</label>
          <textarea
            placeholder="VD: Cuộc bầu cử để chọn ra BCH lớp nhiệm kỳ 2024-2025"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate("/")} disabled={isLoading}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Đang tạo..." : "Tạo Cuộc Bầu Chọn"}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="tx-pending">
          Đang xử lý giao dịch trên blockchain... Xác nhận trên MetaMask và chờ đợi.
        </div>
      )}
    </div>
  );
};

export default CreateVotingPage;
