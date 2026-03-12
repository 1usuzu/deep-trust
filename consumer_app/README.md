# Consumer App — DeepTrust.AI

Cổng giao diện cho tổ chức (báo chí, nền tảng nội dung) xác thực ảnh qua Core API và áp dụng chính sách xuất bản.

## Khởi động

```bash
# Từ thư mục gốc face/
pip install -r consumer_app/requirements.txt

# Copy env
cp consumer_app/env.example consumer_app/.env

# Chạy (không cần reload để tránh conflict với did_system)
python -m uvicorn consumer_app.app:app --port 8001
```

## Routes

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/` | Portal chính — form upload + audit log |
| POST | `/verify` | Submit ảnh, nhận kết quả + lưu audit |
| GET | `/verify/{hash}` | Trang public xem kết quả theo image hash |
| GET | `/api/stats` | JSON stats |
| GET | `/api/health` | JSON health |

## Cấu trúc

```
consumer_app/
├── app.py              # FastAPI application
├── requirements.txt    # Python dependencies
├── env.example         # Mẫu biến môi trường
├── data/
│   └── consumer_audit.db   # SQLite audit log (tự tạo)
└── templates/
    ├── index.html          # Portal chính
    └── verify_public.html  # Trang xem kết quả public
```

## Kết nối Core API

Consumer App gọi `VERIFICATION_API_URL` (mặc định `http://127.0.0.1:8000`) qua:

- `POST /v1/consumer/verify-image` — AI verify + policy decision
- `GET  /v1/consumer/image-status-public/{hash}` — tra cứu public
- `GET  /v1/health` — kiểm tra trạng thái

## Blockchain end-to-end (không cần MetaMask)

Portal có thể **ghi kết quả lên blockchain** theo mô hình *server ký transaction* (custodial) để demo end-to-end:

- Deploy smart contract bằng Hardhat: chạy script trong `blockchain/scripts/deploy.js`
- Copy địa chỉ contract + RPC/chainId vào `backend/.env`:
  - `RPC_URL=...`
  - `CHAIN_ID=...`
  - `CONTRACT_ADDRESS=...`
- Trong portal, tick **“Ghi lên Blockchain (server ký — không cần MetaMask)”** khi verify.

Lưu ý: mô hình này ưu tiên UX demo; nếu cần đúng “phi tập trung”, user sẽ tự ký tx (MetaMask) ở `frontend/`.

Cần đặt `API_KEY` khớp với `API_KEYS` trong backend `.env`.
