import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";
import CandidateCard from "../components/CandidateCard";

const VotePage = () => {
  const { candidates, vote, isLoading, isAdmin, votingOpen, currentVotingAddress, zkpVerified } =
    useContext(VotingContext);
  const navigate = useNavigate();

  if (!currentVotingAddress) {
    return (
      <div className="page-message">
        <h2>Chưa chọn cuộc bầu chọn</h2>
        <p>Vui lòng chọn một cuộc bầu chọn để tham gia bỏ phiếu.</p>
        <button className="btn btn-outline" onClick={() => navigate("/select-voting")}>Chọn cuộc bầu chọn</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-message">
        <h2>Đang xử lý phiếu bầu...</h2>
        <p>Vui lòng chờ xác nhận giao dịch trên MetaMask.</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="page-message">
        <h2>Truy cập bị từ chối</h2>
        <p>Admin không được phép bỏ phiếu.</p>
      </div>
    );
  }

  if (!votingOpen) {
    return (
      <div className="page-message">
        <h2>Bầu cử đã đóng</h2>
        <p>Cuộc bầu cử đã kết thúc. Vui lòng xem kết quả tại trang "Kết quả".</p>
      </div>
    );
  }

  if (!zkpVerified) {
    return (
      <div className="page-message">
        <h2>Cần xác minh danh tính</h2>
        <p>Bạn phải xác minh danh tính trước khi bỏ phiếu.</p>
        <button className="btn btn-primary" onClick={() => navigate("/verify")}>Xác Minh Ngay</button>
      </div>
    );
  }

  return (
    <div className="vote-page">
      <h2>Danh sách ứng viên</h2>
      <p>Chọn ứng viên để bỏ phiếu</p>
      <div className="candidate-list">
        {candidates && candidates.length > 0 ? (
          candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} onVote={vote} />
          ))
        ) : (
          <p>Chưa có ứng viên nào. Vui lòng liên hệ Admin để thêm ứng viên.</p>
        )}
      </div>
    </div>
  );
};

export default VotePage;
