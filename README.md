# Nova Chat AI — GitHub-ready V3 Hybrid Offline/Online

A production-oriented WhatsApp-style messaging starter with an AI media studio.

## V2 features
- React + Vite frontend
- Express + Socket.IO backend
- PostgreSQL-ready schema
- JWT authentication foundation
- 1-to-1 and group conversation model
- Real-time messaging, typing and read receipts
- Media upload abstraction
- AI chat using the OpenAI Responses API
- Image generation
- Video-generation provider adapter
- Image-to-video provider adapter
- AI voice/transcription adapter points
- Style presets
- AI media gallery model
- Docker Compose
- PWA installability + service worker offline shell
- IndexedDB local message/conversation cache
- Offline outbox with automatic sync on reconnect
- Background Sync enhancement where supported
- GitHub Actions CI
- Security middleware, rate limiting and helmet
- `.env.example` files with no secrets

## Important
This project is a starter architecture, not a complete WhatsApp clone. It does not include proprietary WhatsApp code, credentials, infrastructure, model weights, or closed-source video models.

For AI, configure your own API/provider credentials. OpenAI's current platform documentation shows the Responses API for model requests and GPT Image 2 for image generation; video models/providers have their own APIs and contracts, so the video adapter is intentionally isolated.

## Local setup
1. Copy `server/.env.example` to `server/.env`.
2. Set your API keys and database URL.
3. Run:
   `docker compose up --build`
4. Frontend: http://localhost:5173
5. API: http://localhost:4000

## GitHub
Commit everything except `.env` and generated uploads. GitHub Actions runs install/build checks for both packages.

## Production hardening
Before launch, add:
- managed PostgreSQL + migrations
- Redis adapter for Socket.IO
- object storage such as S3-compatible storage
- OTP/passkey authentication
- Web Push / FCM / APNs
- background job queue
- antivirus/media scanning
- abuse prevention and moderation
- E2EE protocol implementation audited by security experts
- call infrastructure (WebRTC/SFU)
- observability and backups

## Offline behavior
The client is offline-first for cached conversations and queued text messages. A service worker caches the app shell, IndexedDB stores local data, and queued messages sync when connectivity returns. Background Sync is used when supported; the app also listens for the browser's `online` event as a fallback. Browser support for Background Sync varies, so it should not be treated as the only synchronization mechanism.

Cloud AI, cloud video generation, cloud calls, and server-backed delivery still require connectivity. A future native build can bundle a local model for genuinely offline AI.
