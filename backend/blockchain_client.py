import os
from dataclasses import dataclass
from typing import Optional, Any

from web3 import Web3
from eth_account import Account


# Minimal ABI for DeepfakeVerification.recordVerificationByIssuer(...)
_DEEPFAKE_VERIFICATION_ABI: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "recordVerificationByIssuer",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_subject", "type": "address"},
            {"name": "_imageHash", "type": "bytes32"},
            {"name": "_subjectDid", "type": "string"},
            {"name": "_isReal", "type": "bool"},
            {"name": "_confidence", "type": "uint256"},
        ],
        "outputs": [],
    }
]


@dataclass
class ChainConfig:
    rpc_url: str
    chain_id: int
    contract_address: str


class BlockchainClient:
    def __init__(self, private_key: str, cfg: ChainConfig):
        self.cfg = cfg
        self.w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
        if not self.w3.is_connected():
            raise RuntimeError(f"Cannot connect RPC at {cfg.rpc_url}")
        self.account = Account.from_key(private_key)
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(cfg.contract_address),
            abi=_DEEPFAKE_VERIFICATION_ABI,
        )

    @staticmethod
    def from_env(private_key: str) -> Optional["BlockchainClient"]:
        rpc_url = os.environ.get("RPC_URL", "").strip()
        chain_id = int(os.environ.get("CHAIN_ID", "0") or 0)
        contract_address = os.environ.get("CONTRACT_ADDRESS", "").strip()
        if not rpc_url or not chain_id or not contract_address:
            return None
        return BlockchainClient(private_key, ChainConfig(rpc_url, chain_id, contract_address))

    def record_verification_by_issuer(
        self,
        subject_address: str,
        image_hash_hex: str,
        subject_did: str,
        is_real: bool,
        confidence: float,
    ) -> str:
        subject = Web3.to_checksum_address(subject_address)

        # Accept 64-hex or 0x-prefixed 32-byte hex.
        h = image_hash_hex.lower().strip()
        if h.startswith("0x"):
            h = h[2:]
        if len(h) != 64:
            raise ValueError("image_hash must be a 32-byte hex string (64 hex chars)")
        image_hash = bytes.fromhex(h)

        conf_int = int(max(0.0, min(1.0, float(confidence))) * 10_000)  # basis points

        fn = self.contract.functions.recordVerificationByIssuer(
            subject,
            image_hash,
            subject_did or "",
            bool(is_real),
            conf_int,
        )

        nonce = self.w3.eth.get_transaction_count(self.account.address)
        tx = fn.build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "chainId": int(self.cfg.chain_id),
            }
        )

        # Gas estimate (fallback if RPC refuses estimate)
        try:
            tx["gas"] = int(self.w3.eth.estimate_gas(tx))
        except Exception:
            tx["gas"] = 500_000

        # EIP-1559 if available, else legacy
        try:
            latest = self.w3.eth.get_block("latest")
            base_fee = latest.get("baseFeePerGas")
            if base_fee is not None:
                priority = self.w3.to_wei(1, "gwei")
                tx["maxPriorityFeePerGas"] = priority
                tx["maxFeePerGas"] = int(base_fee) + int(priority) * 2
            else:
                tx["gasPrice"] = int(self.w3.eth.gas_price)
        except Exception:
            tx["gasPrice"] = int(self.w3.eth.gas_price)

        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

