import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";

const WelcomePage = () => {
  const { currentAccount, zkpVerified } = useContext(VotingContext);
  const navigate = useNavigate();

  const generatedDid = currentAccount ? `did:deepfake:${currentAccount.toLowerCase().replace('0x', '')}` : '';

  const copyDID = () => {
    if (generatedDid) {
      navigator.clipboard.writeText(generatedDid).then(() => alert('DID copied to clipboard!'));
    }
  };

  return (
    <div className="welcome-page">
      <div className="hero" style={{ marginTop: '8px', marginBottom: '24px' }}>
        <h1 className="brand-font">Hệ thống Bỏ phiếu Ẩn danh</h1>
        <p className="subtitle">
          Powered by DeepTrust.AI &amp; Ethereum Blockchain
        </p>
      </div>

      {currentAccount ? (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          <div className={`did-status-card ${zkpVerified ? 'active' : ''}`} style={{ marginBottom: '16px', textAlign: 'left', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="did-header">
              <span className="did-title" style={{ fontSize: '1.2rem' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Decentralized Identity
              </span>
              <span className={`status-badge ${zkpVerified ? 'verified' : 'unverified'}`}>
                {zkpVerified ? '✓ ACTIVE' : 'UNVERIFIED'}
              </span>
            </div>

            {zkpVerified ? (
              <>
                <div className="did-value" style={{ padding: '16px', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}>
                  {generatedDid}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={copyDID}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: '0.9rem', fontWeight: 600,
                      color: 'var(--primary)', background: 'rgba(37,99,235,.1)',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Copy DID
                  </button>
                  <button
                    onClick={() => navigate("/select-voting")}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: '0.9rem', fontWeight: 600,
                      color: 'var(--text-main)', background: 'rgba(15, 23, 42, 0.05)',
                      border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    View Portal ↗
                  </button>
                </div>
                <div style={{ fontSize: '.85rem', color: 'var(--success)', marginTop: '16px', textAlign: 'center', fontWeight: '500' }}>
                  ● Identity active — on-chain verification enabled
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
                  Bạn cần xác minh danh tính Toán Học (ZKP) để chứng minh mình là người thật trước khi có quyền tham gia bỏ phiếu.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1rem' }}
                  onClick={() => navigate("/verify")}
                >
                  Xác Minh Ngay
                </button>
              </>
            )}
          </div>

          <div className="action-cards" style={{ marginTop: '0', opacity: zkpVerified ? 1 : 0.4, pointerEvents: zkpVerified ? 'auto' : 'none' }}>
            <div
              className="action-card card-create"
              onClick={() => { if (zkpVerified) navigate("/create-voting"); }}
            >
              <h2>Tạo Bầu Chọn</h2>
              <p>Tạo cuộc bầu chọn mới và trở thành quản trị viên</p>
            </div>
            <div
              className="action-card card-join"
              onClick={() => { if (zkpVerified) navigate("/select-voting"); }}
            >
              <h2>Tham Gia Bầu Chọn</h2>
              <p>Chọn một cuộc bầu chọn có sẵn để bỏ phiếu</p>
            </div>
          </div>

        </div>
      ) : (
        <div className="connect-prompt glass-panel" style={{ maxWidth: '500px', margin: '18px auto', padding: '30px 24px', textAlign: 'center', background: 'var(--surface)' }}>
          <div style={{ marginBottom: '24px', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: '16px', background: 'rgba(37,99,235,0.1)', borderRadius: '50%' }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h3 className="brand-font" style={{ marginBottom: '16px', color: 'var(--text-main)', fontSize: '1.5rem' }}>Chưa kết nối ví</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Vui lòng kết nối ví MetaMask ở góc trên bên phải để bắt đầu xác thực danh tính và tham gia hệ thống bầu cử.
          </p>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
