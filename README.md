# Personal Tracker

Không gian làm việc cá nhân kiểu **Linear / Notion** cho người vừa chạy nhiều dự án công việc vừa lo việc cá nhân. Toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt — không backend, không đăng nhập.

## Chạy dự án

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit test (Vitest)
pnpm coverage     # test + độ phủ cho phần logic
pnpm build        # typecheck + build production vào dist/
```

Stack: **Vite + React 19 + TypeScript + Tailwind CSS 4**, Radix UI, dnd-kit, cmdk, sonner, react-markdown, motion.

## Tính năng

| Khu vực | Có gì |
|---|---|
| **Dự án** | Chia theo khu vực *Công việc* / *Cá nhân*, mỗi dự án có màu và **mã** (vd `WEB`) → task có mã `WEB-12`. Sửa, lưu trữ, xoá (task chuyển về Inbox). |
| **Hôm nay** | Quá hạn · hạn hôm nay · đang làm · 7 ngày tới · xong hôm nay; lọc theo khu vực; tick để hoàn thành (có hoàn tác); widget Focus + thói quen. |
| **4 view** cho Inbox / Tất cả / từng dự án | **Board** (kéo-thả, tổng giờ ước lượng mỗi cột), **Danh sách** (nhóm theo trạng thái/dự án/ưu tiên/hạn, đổi trạng thái/ưu tiên ngay trên dòng), **Lịch** (kéo task sang ngày khác để dời hạn), **Timeline** (Gantt: kéo để dời, kéo mép để đổi ngày). Bộ lọc chữ/trạng thái/ưu tiên/hạn/tag, nhớ theo từng trang. |
| **Chi tiết task** | Panel trượt bên phải, deep-link `#/…?task=id`: mô tả Markdown, checklist, bình luận + nhật ký hoạt động tự ghi, ngày bắt đầu/hạn/giờ, ước lượng vs giờ đã log, lặp lại, "bị chặn bởi", tag. |
| **Tạo nhanh** | Phím `C`, gõ tắt ngay trong tiêu đề: `#tag` `!khan/!cao/!tb/!thap` `@homnay/@mai/@t6/@25/12/@+3` `@14h30` `+MÃ` `~1h30` `*dang`. Tuỳ chọn "Tạo thêm". |
| **⌘K** | Tìm task (theo mã, tên không dấu), dự án, ghi chú; chạy lệnh (tạo, đổi giao diện, Focus, xuất dữ liệu). |
| **Focus** | Pomodoro 25/5 · 50/10 · 15/3 chạy xuyên trang (lưu theo mốc thời gian nên reload không mất), gắn task → xong phiên tự log giờ. "Ngòi Focus" chạy trên mép cửa sổ khi đang tập trung. |
| **Thói quen** | Tick theo ngày, chuỗi ngày, lưới 7/14 ngày (bấm để sửa ngày cũ). |
| **Insights** | Hoàn thành / tạo mới / đang mở / quá hạn / giờ làm, luồng việc theo ngày-tuần, khối lượng theo dự án, ước lượng so với thực tế, việc trễ lâu nhất. Có bảng thay cho biểu đồ. |
| **Ghi chú** | Nhiều trang Markdown (bảng, checklist), ghim, gắn dự án, tìm kiếm. |
| **Liên kết** | Bookmark theo nhóm, tự lấy tiêu đề trang. |
| **Dữ liệu** | Xuất/nhập JSON (kiểm tra & làm sạch dữ liệu khi nhập), dọn task đã xong cũ, dữ liệu mẫu, xoá toàn bộ. Dữ liệu từ phiên bản cũ được nâng cấp tự động. |

## Phím tắt

`⌘/Ctrl K` tìm & lệnh · `C` tạo task · `P` bật/tạm dừng Focus · `G` rồi `H/I/A/R/N/F/L` đi tới Hôm nay / Inbox / Tất cả / Insights / Ghi chú / Focus / Liên kết · `Esc` đóng · `Space` nhấc/thả thẻ Board bằng bàn phím.

## Thiết kế

- Nền "giấy" xám rêu cho sidebar, nội dung nằm trên một tấm sáng có viền mảnh; sáng / tối / theo hệ thống.
- Chữ: *Bricolage Grotesque* (tiêu đề), *Be Vietnam Pro* (giao diện), *JetBrains Mono* (mã task, giờ, số).
- Hai khu vực có sắc riêng: Công việc (slate lạnh), Cá nhân (đất nung ấm). Màu chủ đạo tuỳ chỉnh, chỉ dùng cho điểm nhấn + hoàn thành; đỏ dành cho quá hạn/khẩn cấp.

So sánh với Notion/Jira/Linear và kế hoạch: [`docs/pmis-roadmap.md`](docs/pmis-roadmap.md).

## Cấu trúc

```
src/
├── app.tsx                 # shell: sidebar + trang + overlay, phím tắt
├── pages/                  # today, task-scope (inbox/all/project), insights, notes, focus, links
├── components/
│   ├── shell/              # sidebar, command palette, page header, focus fuse, ui-store
│   ├── settings/           # settings modal, giao diện, dữ liệu
│   └── ui/                 # button, menu, modal, sheet, popover, date picker, markdown…
├── features/
│   ├── tasks/              # model (migrate, activity, recurrence), selectors, quick-add, store, views/, detail/
│   ├── projects/ notes/ focus/ habits/ bookmarks/ insights/
│   └── workspace/          # sample data, backup
└── lib/                    # store (useSyncExternalStore + localStorage), router, date, duration, text, hotkeys
```
