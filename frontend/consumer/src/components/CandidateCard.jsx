import React from "react";

const CandidateCard = ({ candidate, onVote, disabled }) => {
  const handleVote = () => {
    if (window.confirm(`Ban co chac muon bo phieu cho ${candidate.name}?`)) {
      onVote(candidate.id);
    }
  };

  return (
    <div className="candidate-card">
      <h3>{candidate.name}</h3>
      <p><strong>ID:</strong> {candidate.id}</p>
      <p><strong>Dia chi vi:</strong></p>
      <p className="candidate-address">{candidate.candidateAddress}</p>
      <p><strong>So phieu:</strong> <span className="vote-count">{candidate.voteCount}</span></p>
      <button onClick={handleVote} className="vote-button" disabled={disabled}>
        Bo phieu
      </button>
    </div>
  );
};

export default CandidateCard;
