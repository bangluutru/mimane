# Brief thiết kế logo Mimane (gửi Claude Design)

Dán toàn bộ phần dưới đường kẻ vào Claude Design.

---

Thiết kế bộ nhận diện logo cho **Mimane**, một ứng dụng của Chotto. Dùng design
system **chottoday** làm nền:
https://claude.ai/artifact/7uwskr47ocLZjMfWwRMFP4

Tiền lệ cần xem trước: canvas **英級アップ × Chotto**
(https://claude.ai/artifact/4hLhB1GmAyjf9aUPf7hA3v), nhất là hai artboard logo
("Logo 英級アップ · 3 phương án" và "phương án D"). Mimane phải đứng cạnh các
ứng dụng chị em (Toolio, JLPT Guru, 英級アップ, まなびプリント, Typing4English)
trong khối "Ứng dụng của Chotto" trên chottoday.com mà không lạc tông.

## Sản phẩm

- **Mimane** — luyện nghe và shadowing từng câu: nghe người bản xứ, đọc theo,
  nói theo, ghi âm giọng mình rồi so với bản xứ. Ba ngôn ngữ: tiếng Nhật, tiếng
  Anh (cho người Việt) và tiếng Việt (cho người nước ngoài).
- Chạy ở `mimane.chottoday.com`, xếp nhóm **Tiếng Nhật & học tập** → màu chủ đề
  **Tím Lam** (`cat-study`), giống JLPT Guru.
- Tên gợi **まね (mane) — bắt chước**: nghe rồi làm theo. Nếu muốn đưa nghĩa
  của tên vào hình, hỏi chủ sản phẩm xác nhận trước, đừng tự gán nghĩa.
- Người dùng: người Việt ở Nhật 18–35 tuổi và người nước ngoài học tiếng Việt.
  Tính cách: thân thiện, bình tĩnh, đáng tin — không trẻ con, không "gamer".

## Ràng buộc từ hệ Chotto

1. **Hình học như logo Chotto:** dựng từ hình cơ bản (vòng tròn, thanh bo đầu
   tròn), mọi kích thước là bội số của **x = độ dày nét**. Không vẽ tay, không
   nét thư pháp.
2. **Màu:** Mực `#1E2A44`, Giấy `#FBF9F5`, và **một** màu nhấn Tím Lam
   `#AB8DF5` (chỉ làm mảng/chấm, không làm chữ trên nền sáng). Không thêm màu
   thứ ba, không gradient, không bóng đổ, không viền trang trí.
3. **Điểm tròn "một chút":** biểu tượng Chotto có một chấm tròn đường kính x.
   Logo Mimane nên có một chi tiết tương đương (chấm Tím Lam) để nhận ra là
   người nhà Chotto.
4. **Không emoji, không hình minh hoạ.** Không micro, tai nghe hay sóng âm kiểu
   clip-art; nếu dùng ý "âm thanh" thì trừu tượng hoá bằng hình học.
5. **Chữ "Mimane":** nếu có logo chữ thì dựng bằng hình học hoặc chỉnh từ Nunito
   800 (phông tiêu đề của Chotto), rồi chuyển hết thành path. Tên luôn là
   "Mimane", viết hoa chữ M đầu.
6. **Logo Chotto trong lockup** dùng đúng file gốc `chotto-logo-full.svg` của
   design system, không gõ lại bằng phông khác, rộng tối thiểu 110px.

## Cần giao

1. **Biểu tượng vuông** (app icon, favicon, ô trong "Ứng dụng của Chotto"):
   khung 64×64, nền Mực bo góc `rx 15` (giống các ứng dụng chị em), hình màu
   Giấy + chấm Tím Lam. Phải đọc được ở **16, 24, 32, 44px** — xuất bản xem thử ở
   bốn cỡ này. Dưới 24px được phép bỏ chi tiết nhỏ (như Chotto bỏ chấm Cam).
2. **Logo chữ "Mimane"** cho header (cao hiển thị ~22px trên mobile, ~26px
   desktop).
3. **Lockup "Mimane · by Chotto":** logo chữ Mimane + vạch dọc 1px
   `#E6E2D9` + chữ "by" 13px `#666D7A` + logo Chotto sáu màu 110px. Bản ngang và
   bản xếp dọc (cho cột điều hướng 236px).
4. **Biến thể màu** cho cả ba mục trên: chính (trên Giấy/trắng), âm bản (trên
   Mực và chế độ tối `#0F1626` — chữ Giấy, chấm Tím Lam sáng `#C4AEFF`), đơn
   sắc Mực.
5. **Quy cách:** vùng an toàn = x quanh mọi phía, kích thước tối thiểu, 3–4 lỗi
   cấm (như trang logo của sổ tay Chotto).

Khám phá **3 hướng** trước khi chốt, mỗi hướng một artboard có icon ở 4 cỡ và
logo chữ, ví dụ:

- **A. Nhịp nghe–nói:** hai vòng tròn/nửa vòng lồng nhau như tiếng vọng — một
  bên là bản xứ, một bên là người học nói theo.
- **B. Chữ "m" hình học:** chữ m dựng từ các thanh bo tròn cùng độ dày x, đỉnh
  chữ gợi nhịp sóng; chấm Tím Lam như dấu chấm của chữ "i".
- **C. Tiếp nối biểu tượng hiện tại:** sóng hai nhịp màu Giấy + chấm Tím Lam trên
  nền Mực (bản tạm đang dùng) — làm lại cho đúng hình học x, cân lại khoảng
  trống và độ dày ở 16px.

## Giao file

- SVG sạch: chỉ `path`/`circle`/`rect`, không `<text>`, không font nhúng, không
  `<style>`, `viewBox` ôm sát hình (chừa vùng an toàn khi đặt, không trong file).
- Tên file:
  - `mimane-icon.svg` (vuông 64, nền Mực) — dùng làm `favicon.svg` của Mimane và
    `public/apps/mimane.svg` của chottoday.
  - `mimane-logo.svg`, `mimane-logo-white.svg`, `mimane-logo-ink.svg` (logo chữ).
  - `mimane-lockup.svg`, `mimane-lockup-white.svg` (kèm by Chotto).
- Một artboard "Cách dùng": cỡ tối thiểu, vùng an toàn, nền được phép, lỗi cấm.

## Tham chiếu hiện trạng

- Biểu tượng tạm: sóng hai nhịp màu Giấy, chấm Tím Lam, trên nền Mực `rx 14`.
- Logo chữ tạm: "Mimane" Nunito 800 22px màu Mực + chấm Tím Lam 7px sau chữ "e".
- Header hiện tại: `Mimane● | by [logo Chotto 110px]` trên nền Giấy mờ, cao
  56px (mobile) / 72px (desktop).
