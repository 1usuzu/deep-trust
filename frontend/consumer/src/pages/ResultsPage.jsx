import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";

const ResultsPage = () => {
  const { candidates, isLoading, currentVotingAddress, votingInfo } = useContext(VotingContext);
  const navigate = useNavigate();

  if (!currentVotingAddress) {
    return (
      <div className="page-message">
        <h2>Chua chon cuoc bau chon</h2>
        <p>Vui long chon mot cuoc bau chon de xem ket qua.</p>
        <button className="btn btn-outline" onClick={() => navigate("/select-voting")}>Chon bau chon</button>
      </div>
    );
  }

  if (isLoading) return <div className="loading">Dang tai ket qua...</div>;

  if (!candidates || candidates.length === 0) {
    return <div className="page-message"><p>Chua co ung vien nao.</p></div>;
  }

  const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = sorted.reduce((s, c) => s + c.voteCount, 0);

  return (
    <div className="results-page">
      <h2>Ket Qua Bo Phieu</h2>
      {votingInfo && <p className="desc">{votingInfo.title}</p>}

      <div className="results-summary">
        <span>Tong so phieu: <strong>{totalVotes}</strong></span>
        <span>So ung vien: <strong>{sorted.length}</strong></span>
      </div>

      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ung Cu Vien</th>
            <th>So Phieu</th>
            <th>Ti Le</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={c.id} className={i === 0 && c.voteCount > 0 ? "winner" : ""}>
              <td>{i + 1}</td>
              <td>{c.name}</td>
              <td>{c.voteCount}</td>
              <td>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: totalVotes > 0 ? `${(c.voteCount / totalVotes) * 100}%` : "0%" }}
                  />
                  <span>{totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsPage;
