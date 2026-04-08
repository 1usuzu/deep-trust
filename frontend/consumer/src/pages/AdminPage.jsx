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
    if (!candidateName || !candidateAddress) return alert("Nhập đầy đủ thông tin ứng viên!");
    addCandidate(candidateName, candidateAddress);
    setCandidateName("");
    setCandidateAddress("");
  };

  if (!currentVotingAddress) {
    return (
      <div className="page-message">
        <h2>Chưa chọn cuộc bầu chọn</h2>
        <button className="btn btn-outline" onClick={() => navigate("/select-voting")}>Chọn bầu chọn</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-message">
        <h2>Đang xử lý...</h2>
        <p>Xác nhận giao dịch trên MetaMask và chờ đợi.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-message">
        <h2>Truy cập bị từ chối</h2>
        <p>Chỉ Admin mới có quyền quản lý.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h2>Trang Quản Trị</h2>

      <div className={`voting-status-box ${votingOpen ? "open" : "closed"}`}>
        <h3>Trạng thái bầu cử: {votingOpen ? "ĐANG MỞ" : "ĐÃ ĐÓNG"}</h3>
        <p>{votingOpen ? "Cử tri có thể bỏ phiếu" : "Cử tri không thể bỏ phiếu"}</p>
        <button
          className={`btn ${votingOpen ? "btn-danger" : "btn-success"}`}
          onClick={votingOpen ? closeVoting : openVoting}
          disabled={isLoading}
        >
          {votingOpen ? "Đóng Bầu Cử" : "Mở Bầu Cử"}
        </button>
      </div>

      <div className="admin-form">
        <h3>Thêm Ứng Viên Mới</h3>
        <form onSubmit={handleAddCandidate}>
          <div className="form-group">
            <label>Tên ứng viên:</label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Địa chỉ ví (MetaMask):</label>
            <input
              type="text"
              placeholder="0x..."
              value={candidateAddress}
              onChange={(e) => setCandidateAddress(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Địa chỉ ví phải bắt đầu bằng 0x và có 42 ký tự"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Thêm Ứng Viên"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
