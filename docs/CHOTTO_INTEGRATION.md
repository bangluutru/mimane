# Mimane × Chotto — thiết kế và tích hợp

Mimane là một ứng dụng của Chotto, chạy ở tên miền phụ như các ứng dụng chị em
(JLPT Guru, 英級アップ, まなびプリント). Giao diện dựng trên design system
**chottoday**: <https://claude.ai/artifact/7uwskr47ocLZjMfWwRMFP4>.

## Ánh xạ design system

| Chotto | Mimane |
| --- | --- |
| Nền `surface-canvas` Giấy #FBF9F5, thẻ trắng, viền `border-card` 1px, không bóng | Toàn bộ trang, thẻ bài học, panel, sheet |
| Chữ Mực: `text-primary` / `text-secondary` / `text-muted` | Tiêu đề / thân / meta |
| Màu chủ đề = hệ phân loại | Mimane thuộc **Tiếng Nhật & học tập** → **Tím Lam `cat-study`**: ô icon, thanh tiến trình, chấm trình độ, từ đang chọn |
| San Hô = "đang ở đây" (gạch chân 2.5px), lỗi | Mục điều hướng đang mở, nút ghi âm đang chạy, cảnh báo |
| Nút chính Mực (`btn-primary`), nút phụ viền nhạt | `.btn.primary`, `.btn`; nút phát tròn Mực |
| Nunito 800 cho tiêu đề và số lớn, Be Vietnam Pro cho nội dung | `--font-heading`, `--font-body` (Google Fonts) |
| Thang 4·8·12·18·28·48, control 48px, bo 12 → 22px | `--space-*`, `--control-height`, `--radius-*` |
| `SectionHead` (ô icon 44px + tiêu đề + mô tả + "Xem tất cả") | Các mục trang chủ |
| `IntentPill` / `CategoryChip` | `.chip` (đang chọn = Mực), `.badge.accent` |
| Dải bạc hà "hỏi Chotto" — gradient duy nhất | `ChottoBand` dẫn về chottoday.com (trang chủ, cài đặt) |
| Hoạ tiết "một chút": vòng tròn rỗng, chấm tròn, ≤15 %, không dưới chữ | Hero, onboarding, khung audio, ảnh bìa bài học |
| Ảnh bìa bài viết: hoạ tiết hình học, không chữ | `CoverArt` — tất định theo id bài |
| Icon giao diện nét 2px `currentColor`, không emoji | Lucide, nét 2; bỏ cờ và emoji chủ đề, ngôn ngữ ghi bằng mã `JA`/`EN`/`VI` |
| Logo: dùng file gốc, không gõ lại | `public/brand/chotto-logo-full.svg` (bản đã sửa khung), bản trắng cho chế độ tối, rộng 110px |
| Chế độ tối "Đêm" | `prefers-color-scheme: dark`, đúng giá trị trong tokens |
| Focus: vòng Ngọc 3px | `--focus-ring` trên mọi phần tử bấm được |

## Ngoại lệ có chủ đích

1. **Sáu màu thanh điệu tiếng Việt.** Sổ tay giới hạn hai màu nhấn mỗi màn hình.
   Thanh điệu là mã hoá sư phạm, không phải trang trí, nên dùng đúng sáu màu chữ
   AA của Chotto (`cat-*-text`, ≥4.5:1 trên Giấy, khác nhau cả về độ sáng).
   Người học tắt được trong "Hỗ trợ đọc". **Đã duyệt (2026-09-26).**
2. **Phông tiếng Nhật.** Nunito và Be Vietnam Pro không có kana/kanji. Chữ Nhật
   rơi về phông hệ thống (Hiragino Sans / Noto Sans JP), không tải phông thứ ba.
   **Đã duyệt (2026-09-26).**
3. **Tên "Mimane" là chữ Nunito**, chưa có logo riêng. Các ứng dụng chị em có
   logo vẽ riêng (xem canvas 英級アップ × Chotto). **Đang giao Claude Design** —
   brief ở [MIMANE_LOGO_BRIEF.md](MIMANE_LOGO_BRIEF.md).

## Thêm vào chottoday.com

Mimane chạy như các ứng dụng khác: một trang tĩnh ở tên miền phụ, ví dụ
`mimane.chottoday.com`. Phía chottoday chỉ cần thêm một phần tử vào
`src/data/apps.js` và một biểu tượng vuông trong `public/apps/`:

```js
{
  id: 'mimane',
  name: 'Mimane',
  // ?lang=vi: Mimane đặt ngôn ngữ giao diện theo tham số này ở lần đầu mở.
  url: 'https://mimane.chottoday.com/?lang=vi',
  tagline: 'Luyện nghe và shadowing tiếng Nhật, tiếng Anh, tiếng Việt từng câu, có furigana, IPA và thanh điệu.',
  group: 'Tiếng Nhật',
  tint: 'study',
  logo: '/apps/mimane.svg', // chép từ public/favicon.svg của Mimane
  langs: 'Việt · Anh · Nhật',
},
```

`scripts/test-discovery.mjs` của chottoday kiểm: id không trùng, URL https thuộc
`*.chottoday.com`, logo có thật trong `public/`.

Triển khai Mimane: `npm run build` → thư mục `dist/` (SPA, cần fallback về
`index.html`, Cloudflare Pages tự làm khi không có `404.html`). Transcriber cục
bộ (`npm run transcriber`) không triển khai lên web: nó chạy trên máy người học.
