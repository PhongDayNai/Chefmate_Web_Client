# BEPTROLY Web (Next.js)

Ứng dụng web BEPTROLY đã được migrate sang **Next.js App Router**.

## Yêu cầu

- Node.js 20+

## Cài đặt

```bash
npm install
```

## Biến môi trường

Tạo file `.env.local` từ `.env.example`:

```bash
cp .env.example .env.local
```

Mặc định:

- `NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com`
- `NEXT_PUBLIC_CHAT_API_TOKEN=sk-tao-deo-cho-chat`

Các request đi vào nhóm endpoint `/api/ai-chat*` sẽ tự động được gắn header:

```http
Authorization: Bearer <NEXT_PUBLIC_CHAT_API_TOKEN>
```

## Chạy local

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Build production

```bash
npm run build
npm run start
```

## Kiểm tra type

```bash
npm run typecheck
```
