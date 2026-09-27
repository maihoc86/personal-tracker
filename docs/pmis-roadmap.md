# Personal Tracker → PMIS cá nhân: so sánh & kế hoạch

> Ngày: 2026-09-27 · Bối cảnh: một người vừa chạy nhiều dự án công việc vừa lo việc cá nhân/gia đình, muốn một workspace kiểu Linear/Notion chạy hoàn toàn trên trình duyệt (localStorage, không backend).

## 1. Hiện trạng (trước đợt này)

Một màn hình bento với ảnh nền: Todo (Kanban 4 cột + Lịch tháng), Pomodoro, 1 ghi chú, Bookmark, Thói quen. Task có tiêu đề, mô tả, hạn chót (+giờ), trạng thái, ưu tiên 3 mức, ước lượng giờ, tag, checklist. Dữ liệu lưu localStorage, mỗi card tự giữ state riêng.

## 2. So sánh với Notion / Jira / Linear

| Năng lực | Jira | Notion | Linear | Personal Tracker (cũ) | Đợt này |
|---|---|---|---|---|---|
| Nhóm việc theo dự án / không gian | Project, Epic | Database, Teamspace | Team, Project | — | **Dự án** thuộc khu vực *Công việc* / *Cá nhân*, Inbox cho việc chưa phân loại |
| Mã định danh task | `PRJ-123` | — | `ENG-123` | — | **Mã task** `WEB-12`, tìm được theo mã |
| Nhiều view trên cùng dữ liệu | Board, List, Timeline, Calendar | Table, Board, Calendar, Timeline, List | Board, List, Timeline | Board, Lịch | **Board · Danh sách · Lịch · Timeline** |
| Lọc / nhóm / sắp xếp | JQL, filter | Filter, group, sort | Filter, display options | — | **Bộ lọc** (ưu tiên, tag, hạn, trạng thái, chữ) + nhóm/sắp xếp ở List |
| Tìm kiếm toàn cục & lệnh | Search | ⌘K / ⌘P | ⌘K | — | **⌘K** tìm task/dự án/ghi chú + chạy lệnh, bỏ dấu tiếng Việt khi so khớp |
| Tạo nhanh | Quick create | `/` commands | `C` + cú pháp | Dialog form | **Phím `C`** + cú pháp `#tag !cao @mai +WEB ~2h` |
| Trang "việc của tôi hôm nay" | Your work | — | My issues | — | **Hôm nay**: quá hạn / hôm nay / 7 ngày tới / đang làm, lọc theo khu vực |
| Báo cáo | Dashboards, burndown | Chart view | Insights | — | **Insights**: luồng việc theo ngày, khối lượng theo dự án, ước lượng vs thực tế, phút tập trung |
| Bình luận & lịch sử | Comments, History | Comments, page history | Comments, activity | — | **Bình luận + nhật ký hoạt động** tự ghi (trạng thái, ưu tiên, hạn, dự án) |
| Theo dõi thời gian | Time tracking | — | — | Ước lượng giờ | **Log thời gian** thủ công + tự log khi hoàn thành phiên Focus gắn task |
| Việc lặp lại | Plugin | — | Recurring issues | — | **Lặp lại** hằng ngày / ngày làm việc / hằng tuần / hằng tháng |
| Phụ thuộc | Issue links | Relations | Blocked by | — | **Bị chặn bởi** + cảnh báo trên thẻ |
| Tài liệu / trang | Confluence | Pages | Docs | 1 ô ghi chú | **Nhiều trang ghi chú** Markdown, gắn dự án, ghim |
| Sao lưu / di chuyển dữ liệu | Export | Export | Export | — | **Xuất / nhập JSON** có kiểm tra dữ liệu |
| Phím tắt | Có | Có | Rất nhiều | — | `⌘K`, `C`, `G` + `H/I/A/N/F/L`, `Esc` |
| Hoàn tác | — | Có | Có | — | **Hoàn tác** khi xoá task/ghi chú |

Không làm trong đợt này (không hợp với một người dùng, chạy offline): phân quyền, người được giao, sprint/velocity, workflow tuỳ biến, đồng bộ nhiều thiết bị.

## 3. Kế hoạch triển khai

### Giai đoạn 0: Nền tảng
- Store dùng chung (`useSyncExternalStore`) thay cho state riêng từng card, đồng bộ giữa các tab, giữ nguyên key localStorage cũ (`pt.todos`, `pt.habits`, …) và tự nâng cấp dữ liệu cũ.
- Mô hình dữ liệu: `Project`, `Task` mở rộng (dự án, số thứ tự, ngày bắt đầu, bình luận, log giờ, hoạt động, lặp lại, phụ thuộc), `Note` nhiều trang.
- Router hash (`#/today`, `#/project/:id?task=…`) để deep-link và nút Back đóng panel task.
- Parser tạo nhanh, bộ lọc/nhóm/sắp xếp, lặp lại, ghi hoạt động: logic thuần, có unit test (Vitest).

### Giai đoạn 1: Workspace & view
- App shell: sidebar (Hôm nay, Inbox, Tất cả task, Insights, dự án theo khu vực, Ghi chú, Focus, Liên kết), topbar, drawer trên mobile.
- View Board / Danh sách / Lịch / Timeline (kéo để dời, kéo mép để đổi hạn) dùng chung bộ lọc.
- Panel chi tiết task mở từ bên phải (peek): thuộc tính bên phải, mô tả Markdown, checklist, bình luận + hoạt động.

### Giai đoạn 2: Chiều sâu & báo cáo
- Log thời gian, Focus (Pomodoro chạy xuyên trang, gắn task), việc lặp lại, phụ thuộc.
- Insights, nhiều trang ghi chú, xuất/nhập JSON, hoàn tác.

## 4. Thiết kế

- **Chất liệu**: nền giấy xám rêu (graphite-sage), một tờ nội dung sáng có viền mảnh nổi trên nền; tối giản, mật độ cao như công cụ làm việc.
- **Chữ**: *Bricolage Grotesque* cho tiêu đề trang & số liệu lớn (dùng tiết chế), *Be Vietnam Pro* cho giao diện (hiển thị dấu tiếng Việt tốt), *JetBrains Mono* cho mã task, thời gian, số đếm.
- **Hai khu vực**: *Công việc* mang sắc lạnh (slate), *Cá nhân* mang sắc ấm (đất nung); màu từng dự án kế thừa tinh thần đó.
- **Điểm nhận diện**: "ngòi Focus": khi một phiên tập trung đang chạy, một vạch mảnh màu chủ đạo chạy ngang mép trên cửa sổ và cháy dần, trang nào cũng thấy, kèm mã task đang làm ở chân sidebar.
- Màu chủ đạo vẫn tuỳ chỉnh được; sáng / tối / theo hệ thống.
