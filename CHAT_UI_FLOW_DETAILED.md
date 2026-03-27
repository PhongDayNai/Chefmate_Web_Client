# ChefMate Chat UI & Flow (Bepes)

Tài liệu này mô tả chi tiết UI, state và **thứ tự call** cho luồng chat trong client.
Phạm vi chính: `BepesChatScreen`, `ChatSessionsScreen`, `AppFlowViewModel`, `AppFlowApiClient`.

## 1. Thành phần chính

- UI chat: `app/src/main/java/com/watb/chefmate/ui/appflow/BepesChatScreen.kt`
- UI lịch sử session: `app/src/main/java/com/watb/chefmate/ui/appflow/ChatSessionsScreen.kt`
- Điều phối state + business flow: `app/src/main/java/com/watb/chefmate/viewmodel/AppFlowViewModel.kt`
- HTTP client cho app flow/chat: `app/src/main/java/com/watb/chefmate/api/AppFlowApiClient.kt`
- Chat models + business code: `app/src/main/java/com/watb/chefmate/data/AppFlowModel.kt`
- Route điều hướng vào chat: `app/src/main/java/com/watb/chefmate/ui/main/MainActivity.kt`
- Điểm vào từ Home: `app/src/main/java/com/watb/chefmate/ui/home/HomeScreen.kt`

## 2. Route và điểm vào màn chat

Route chat:

- `bepesChat?recipeId={recipeId}` (`recipeId` mặc định `-1`)

Điểm vào chính:

1. Từ Home -> mở chat thường:
   - `navController.navigate("bepesChat?recipeId=-1")`
2. Từ Home -> mở chat gắn recipe:
   - `navController.navigate("bepesChat?recipeId=$recipeId")`
3. Từ màn lịch sử session -> mở một session cụ thể:
   - gọi `appFlowViewModel.openSession(userId, sessionId)` trước
   - sau đó navigate vào `bepesChat?recipeId=-1`

## 3. Chat UI structure

Trong `BepesChatScreen`, bố cục gồm:

1. Header `Bepes`
2. `NeedLoginCard` nếu chưa login
3. `SessionContextSection` (context phiên):
   - món đang chọn
   - trạng thái diet notes
   - action chips: `Chọn món`, `Ghi chú`, `Xem công thức`, `Hoàn thành`
4. `LazyColumn` timeline:
   - loading spinner khi `chatState.loadingTimeline = true`
   - list `chatState.timeline` với `SessionDivider` khi sang phiên
   - `TypingIndicatorBubble` khi `chatState.sending = true`
5. Input box + icon gửi (`CustomTextField`)

UI phụ trợ:

- Recipe picker bottom sheet
- Diet notes bottom sheet
- Dialog editor diet note
- Dialog xác nhận hoàn thành món
- Dialog bắt buộc khi có `pendingPreviousRecipe`

## 4. Nguồn state chính

`ChatUiState`:

- Session hiện tại: `currentSessionId`, `currentSession`
- Danh sách session: `sessions`
- Timeline unified: `timeline`
- Paging: `hasMore`, `nextBeforeMessageId`, `lastRequestedBeforeMessageId`, `noProgressLoadCount`, `limit`
- Runtime flags: `sending`, `loadingTimeline`, `loadingSessions`
- AI busy retry: `aiBusyRetryCount`
- Blocking payload: `pendingPreviousRecipe`
- Error: `errorMessage`

`HomeFlowUiState` liên quan chat context:

- `dietNotes`
- `recommendations`, `readyToCook`, `almostReady`

## 5. Thứ tự call chi tiết theo use-case

## 5.1 Vào màn chat lần đầu (bootstrap unified timeline)

Trigger: `LaunchedEffect(isLoggedIn, userId, recipeId)` trong `BepesChatScreen`.

Thứ tự:

1. `refreshHomeContext(userId)` gọi song song:
   - `GET /api/user-diet-notes?userId=...`
   - `GET /api/pantry?userId=...`
   - `POST /api/ai-chat/recommendations-from-pantry`
2. `bootstrapUnifiedTimeline(userId, activeRecipeId)`
3. Trong `fetchUnifiedTimeline(...)`:
   - `GET /api/ai-chat/messages?userId=...&limit=...`
4. Parse timeline + session từ response.
5. Nếu timeline rỗng và chưa có session, `createSessionIfEmpty = true`:
   - `POST /api/ai-chat/sessions` (title mặc định `Bepes`, có thể kèm `activeRecipeId`)
6. Nếu có `recipeId > 0` và đã có session:
   - `PATCH /api/ai-chat/sessions/active-recipe`

Kết quả: set `chatState.timeline`, `currentSessionId`, `currentSession`, paging cursor.

## 5.2 Gửi tin nhắn chat (flow chính)

Trigger: nhấn send hoặc IME send.

Thứ tự:

1. Guard:
   - bỏ qua nếu message rỗng
   - bỏ qua nếu đang `sending = true`
2. Tạo optimistic user message (`isPending = true`) -> append vào timeline
3. `POST /api/ai-chat/messages` với body:
   - `userId`
   - `message`
   - `stream = false`
4. Nếu server trả `503 + code = AI_SERVER_BUSY`:
   - retry backoff: `3s -> 5s -> 8s`
5. Đánh dấu optimistic message đã delivered (`isPending = false`)
6. Nếu `code = PENDING_PREVIOUS_RECIPE_COMPLETION`:
   - parse payload vào `pendingPreviousRecipe`
   - dừng flow gửi tại đây, hiện dialog bắt buộc
7. Nếu không bị pending:
   - parse session + messages
   - lấy assistant/system messages
   - thay thế optimistic bằng echoed user message (nếu server trả messageId)
   - merge + deduplicate + sort timeline
   - cập nhật paging nếu response có metadata paging

## 5.3 Case pending previous recipe (blocking dialog)

Khi `chatState.pendingPreviousRecipe != null`, UI hiện dialog với 3 action:

- `complete_and_deduct`
- `skip_deduction`
- `continue_current_session`

Khi user chọn action:

1. `POST /api/ai-chat/sessions/resolve-previous`
   - gửi `userId`, `previousSessionId`, `action`, `pendingUserMessage`
2. Parse session/messages trả về, cập nhật timeline/session
3. Nếu success -> gọi lại `fetchUnifiedTimeline(...)` để đồng bộ state mới nhất
   - với `createSessionIfEmpty = (action != continue_current_session)`

## 5.4 Hoàn thành phiên hiện tại bằng nút “Hoàn thành”

Trigger: chip `Hoàn thành` trong `SessionContextSection`.

Thứ tự:

1. Hiện confirm dialog
2. Confirm -> `completeCurrentSession(userId)`
3. `POST /api/ai-chat/sessions/resolve-previous`
   - action cứng: `complete_and_deduct`
   - `pendingUserMessage = null`
4. Cập nhật timeline/session từ response
5. Nếu success -> gọi `fetchUnifiedTimeline(...)` để refresh unified timeline

## 5.5 Load thêm tin nhắn cũ (pagination khi kéo lên đầu)

Trigger: `snapshotFlow` theo `listState`; khi item đầu tiên đang hiển thị.

Điều kiện:

- `hasMore = true`
- `loadingTimeline = false`
- `nextBeforeMessageId != null`

Thứ tự:

1. `GET /api/ai-chat/messages?userId=...&limit=...&beforeMessageId=...`
2. Parse `olderMessages`
3. Merge `olderMessages + timeline hiện tại`
4. Cập nhật `nextBeforeMessageId`, `hasMore`, `noProgressLoadCount`
5. Có chặn loop không tiến triển bằng `MAX_NO_PROGRESS_ATTEMPTS = 2`

## 5.6 Chọn món cho session hiện tại

Trigger: `Chọn món` -> mở recipe picker -> confirm chọn món.

Thứ tự:

1. Mở sheet: `refreshRecommendations(userId)`
   - `POST /api/ai-chat/recommendations-from-pantry`
2. Confirm món -> `selectRecipeForCurrentSession(userId, recipeId)`
3. Nếu chưa có session:
   - `POST /api/ai-chat/sessions`
   - gọi lại `bootstrapUnifiedTimeline(...)`
4. Nếu đã có session:
   - `PATCH /api/ai-chat/sessions/active-recipe`

## 5.7 Quản lý diet notes ngay trong chat

Trigger: `Ghi chú` trong context section.

Thứ tự call:

1. Mở sheet: `GET /api/user-diet-notes?userId=...`
2. Toggle/add/edit:
   - `POST /api/user-diet-notes/upsert`
   - success -> `POST /api/ai-chat/recommendations-from-pantry`
3. Delete:
   - `DELETE /api/user-diet-notes/delete`
   - success -> `POST /api/ai-chat/recommendations-from-pantry`

## 5.8 Mở recipe từ chat context

Trigger: chip `Xem công thức`.

Thứ tự:

1. Lấy recipeName từ recommendation đang active
2. Gọi `ApiClient.searchRecipe(recipeName, userId)`
3. Match theo `recipeId` (fallback phần tử đầu)
4. `onOpenRecipe(matchedRecipe)` -> navigate `recipeView`

## 5.9 Màn lịch sử chat sessions

Trigger: vào `ChatSessionsScreen`.

Thứ tự:

1. `loadSessions(userId)` -> `GET /api/ai-chat/sessions?userId=&page=1&limit=50`
2. Open session:
   - `openSession(userId, sessionId)` -> `GET /api/ai-chat/sessions/{sessionId}?userId=...`
   - navigate vào màn chat
3. Rename session:
   - `PATCH /api/ai-chat/sessions/title`
4. Delete session:
   - `DELETE /api/ai-chat/sessions/{sessionId}?userId=...`

## 6. Logic render timeline và auto-scroll

`BepesChatScreen` xử lý auto-scroll bằng so sánh key message đầu/cuối:

- Nếu prepend tin cũ ở đầu list -> không auto-scroll xuống cuối
- Nếu đang gần cuối list hoặc vừa gửi message -> scroll xuống cuối
- Divider giữa session hiển thị khi:
  - `message.isSessionStart = true`, hoặc
  - `chatSessionId` của message hiện tại khác message trước

Tin nhắn Bepes hỗ trợ markdown nhẹ:

- bỏ heading markers
- đổi bullet `-/*` thành `•`
- hỗ trợ bold cơ bản `**text**`, `__text__`

## 7. Error handling và toast

- `chatState.errorMessage` được show bằng `Toast`
- Sau khi show, gọi `clearChatError()` để reset lỗi
- Khi chưa login, cả chat/sessions dùng `NeedLoginCard`

## 8. Sequence call nhanh (tóm tắt)

1. Mở chat:
   - `refreshHomeContext` -> `bootstrapUnifiedTimeline` -> `GET /messages` -> (nếu rỗng) `POST /sessions`
2. Gửi message:
   - optimistic append -> `POST /messages` -> (retry nếu AI busy) -> merge response
3. Nếu pending previous:
   - hiện dialog -> `POST /sessions/resolve-previous` -> reload unified timeline
4. Kéo lên load cũ:
   - `GET /messages?beforeMessageId=...` -> prepend
5. Đổi món active:
   - `PATCH /sessions/active-recipe`
6. Hoàn thành món:
   - `POST /sessions/resolve-previous` -> refresh timeline

## 9. Ghi chú kỹ thuật quan trọng

- `sendMessage` hiện không gửi `chatSessionId`; backend tự resolve session theo `userId`.
- Parse response rất “defensive”: hỗ trợ nhiều shape (`messages`, `timeline`, `items`, `assistantMessage`...).
- Timeline luôn `deduplicateAndSort` trước khi render.
- Cursor pagination fallback dùng `min(messageId)` nếu server không trả `nextBeforeMessageId` rõ ràng.

