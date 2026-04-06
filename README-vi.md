# ChefMate Web Client

ChefMate Web Client là ứng dụng web trong hệ sinh thái ChefMate, được xây dựng bằng **Next.js App Router**.

Dự án tập trung vào khám phá công thức, luồng nấu ăn theo pantry và trải nghiệm chat server-driven với `Bepes` để hỗ trợ người dùng trong các phiên nấu.

Repository này chỉ chứa web client.

## Tính năng chính

- Duyệt và tìm kiếm công thức
- Xem công thức thịnh hành và kết quả cá nhân hoá
- Xem chi tiết công thức và các bước nấu
- Tạo công thức mới (hỗ trợ upload ảnh)
- Quản lý pantry và ghi chú ăn uống
- Chat với `Bepes` để hỗ trợ nấu ăn theo ngữ cảnh
- Đăng nhập, đăng ký, quản lý hồ sơ người dùng

## Các khu vực trong ứng dụng

- `Auth`: đăng nhập, đăng ký, quản lý phiên
- `Home`: khám phá và điểm vào các luồng chính
- `Search`: tìm kiếm công thức theo từ khoá/tag
- `Recipe`: xem chi tiết và tạo công thức
- `Pantry`: quản lý nguyên liệu hiện có
- `Profile`: thông tin tài khoản và tuỳ chỉnh cá nhân
- `Chat`: hội thoại nấu ăn theo session và meal context

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Docker + Docker Compose

## Website production

- https://chefmate.phongdaynai.id.vn

## Thiết lập local

### Yêu cầu

- Node.js 20+
- npm
- Backend ChefMate JWT API đang chạy

### Cấu hình môi trường

Tạo file env local từ template:

```bash
cp .env.example .env.local
```

Biến chính:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-host.example.com
NEXT_PUBLIC_CHAT_API_TOKEN=replace-with-chat-api-key
```

Mô hình auth client sử dụng:
- API private: `Authorization: Bearer <accessToken>`
- Chat API (`/v2/ai-chat*`, `/v2/ai-chat-v1*`):
  - `Authorization: Bearer <accessToken>`
  - `x-api-key: <NEXT_PUBLIC_CHAT_API_TOKEN>`

## Chạy local

```bash
npm install
npm run dev
```

Mở: `http://localhost:3000`

## Build production

```bash
npm run build
npm run start
```

## Kiểm tra type

```bash
npm run typecheck
```

## Chạy bằng Docker

```bash
docker compose up --build -d
```

Port mặc định:
- `http://localhost:13080`

## Ghi chú kiến trúc

Web client là lớp giao diện cho backend riêng. Trạng thái chat/session được quản lý phía server; frontend chủ yếu render và tương tác theo state backend trả về.

`Bepes` chat hoạt động theo mô hình server-driven, bao gồm:
- vòng đời session
- lịch sử tin nhắn
- món đang focus
- tiến độ meal và completion check

## Cấu trúc repository

- `app/`: routes, features, UI
- `public/`: static assets
- `docs/`: tài liệu tích hợp và ghi chú triển khai
- `Dockerfile`, `docker-compose.yml`: cấu hình container

## Hệ sinh thái

- Android client: [ChefMate_Client](https://github.com/PhongDayNai/ChefMate_Client)
- Server API: [chefmate-server](https://github.com/PhongDayNai/chefmate-server)
- Admin web: [ChefMate_Admin_Web](https://github.com/PhongDayNai/ChefMate_Admin_Web)

## Trạng thái open source

Repository đang được hoàn thiện tài liệu để phù hợp cộng tác open-source.

Nếu anh/chị phát hiện lỗi hoặc muốn cải thiện dự án, vui lòng tạo issue hoặc pull request.

Các file cộng đồng như license/contributing có thể được tiếp tục cập nhật theo từng giai đoạn.

## English README

English version: [README.md](./README.md)
