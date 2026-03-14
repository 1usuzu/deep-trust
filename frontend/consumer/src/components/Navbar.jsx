import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { VotingContext } from "../context/VotingContext";
import { Shield } from 'lucide-react';

const Navbar = () => {
  const { connectWallet, disconnectWallet, currentAccount, isAdmin, votingInfo, zkpVerified } =
    useContext(VotingContext);

  const fmtAddr = (a) => a ? `${a.substring(0, 6)}…${a.slice(-4)}` : '';

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo brand-font" style={{ gap: '12px' }}>
          <div className="logo-icon">
            <Shield size={22} strokeWidth={2} />
          </div>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="logo-text">Voter<span className="text-gradient">.App</span></span>
          </Link>

          <ul className="navbar-nav" style={{ marginLeft: '32px', display: 'flex', gap: '24px', listStyle: 'none', fontWeight: '500', fontSize: '0.95rem' }}>
            <li><Link to="/">Trang chủ</Link></li>
            {currentAccount && (
              <li>
                <Link to="/verify">
                  Xác minh ZKP
                  {zkpVerified && <span className="zkp-dot verified" />}
                </Link>
              </li>
            )}
            {votingInfo && (
              <>
                <li><Link to="/vote">Bỏ phiếu</Link></li>
                <li><Link to="/results">Kết quả</Link></li>
                {isAdmin && <li><Link to="/admin">Quản trị</Link></li>}
              </>
            )}
          </ul>
        </div>

        <div className="header-nav">
          {votingInfo && (
            <div className="current-voting-badge" style={{ marginRight: '16px' }}>
              {votingInfo.title}
              {zkpVerified && <span className="zkp-badge">ZKP</span>}
            </div>
          )}
          {currentAccount ? (
            <div className="wallet-pill">
              <span className="wallet-dot"></span>
              <span className="wallet-addr">{fmtAddr(currentAccount)}</span>
              <button
                className="wallet-disconnect"
                onClick={disconnectWallet}
                title="Ngắt kết nối"
              >✕</button>
            </div>
          ) : (
            <button className="btn btn-primary header-connect-btn" onClick={connectWallet}>
              Kết nối ví
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
