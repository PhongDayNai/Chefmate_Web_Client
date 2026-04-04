# BEPTROLY Web (Next.js)

Ứng dụng web BEPTROLY đã được migrate sang **Next.js App Router**.

## Website production

- https://chefmate.phongdaynai.id.vn

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

Client hiện dùng API JWT ở `:13081 /v2`:

- Sau khi login, private API dùng `Authorization: Bearer <accessToken>`
- Chat API dùng thêm `x-api-key: <NEXT_PUBLIC_CHAT_API_TOKEN>`

Các request chat đi vào nhóm endpoint `/v2/ai-chat*` và `/v2/ai-chat-v1*` sẽ tự động được gắn header:

```http
Authorization: Bearer <accessToken>
x-api-key: <NEXT_PUBLIC_CHAT_API_TOKEN>
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
