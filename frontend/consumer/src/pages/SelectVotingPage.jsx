import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";

const SelectVotingPage = () => {
  const { currentAccount, getAllVotings, selectVoting } = useContext(VotingContext);
  const navigate = useNavigate();
  const [votings, setVotings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await getAllVotings();
      setVotings(list || []);
      setLoading(false);
    })();
  }, [currentAccount]);

  const handleSelect = async (addr) => {
    const ok = await selectVoting(addr);
    if (ok) navigate("/vote");
  };

  if (!currentAccount) {
    return (
      <div className="page-message">
        <h2>Chua ket noi vi</h2>
        <p>Vui long ket noi MetaMask de xem danh sach bau chon.</p>
        <button className="btn btn-outline" onClick={() => navigate("/")}>Quay lai</button>
      </div>
    );
  }

  return (
    <div className="select-voting-page">
      <h2>Chon Cuoc Bau Chon</h2>
      <p className="desc">Chon mot cuoc bau chon de tham gia bo phieu an danh</p>

      {loading ? (
        <div className="loading">Dang tai danh sach bau chon...</div>
      ) : votings.length === 0 ? (
        <div className="empty-state">
          <p>Chua co cuoc bau chon nao</p>
          <button className="btn btn-primary" onClick={() => navigate("/create-voting")}>
            Tao cuoc bau chon dau tien
          </button>
        </div>
      ) : (
        <div className="voting-grid">
          {votings.map((v, i) => (
            <div key={i} className="voting-card" onClick={() => handleSelect(v.address)}>
              <h3>{v.title}</h3>
              {v.description && <p className="voting-desc">{v.description}</p>}
              <div className="voting-meta">
                <p><strong>So ung vien:</strong> {v.candidateCount}</p>
                <p>
                  <strong>Trang thai:</strong>{" "}
                  <span className={v.isOpen ? "status-open" : "status-closed"}>
                    {v.isOpen ? "Dang mo" : "Da dong"}
                  </span>
                </p>
                <p>
                  <strong>Admin:</strong>{" "}
                  <span className={v.isAdmin ? "is-you" : ""}>
                    {v.isAdmin ? "Ban" : `${v.admin.slice(0, 6)}...${v.admin.slice(-4)}`}
                  </span>
                </p>
                <p className="created-at">{v.createdAt}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="page-footer">
        <button className="btn btn-outline" onClick={() => navigate("/")}>Quay lai trang chu</button>
      </div>
    </div>
  );
};

export default SelectVotingPage;
