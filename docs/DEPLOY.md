# Deploy Mimane lên Cloudflare Pages (mimane.chottoday.com)

Mimane là trang tĩnh (Vite SPA). Cloudflare Pages build từ GitHub mỗi lần push
lên `main`, giống chottoday.com.

## 1. Tạo project Pages

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → tab
   **Pages** → **Import an existing Git repository** (Connect to Git).
2. Cho phép Cloudflare đọc GitHub nếu được hỏi, chọn repo **bangluutru/mimane**.
3. Thiết lập build:

   | Ô | Giá trị |
   | --- | --- |
   | Project name | `mimane` → địa chỉ tạm `mimane.pages.dev` |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | để trống |
   | Environment variables | không cần (`.node-version` chọn Node 22) |

4. **Save and Deploy**. Build mất khoảng 1–2 phút.
5. Mở `https://mimane.pages.dev` kiểm tra (mục 3).

## 2. Gắn tên miền mimane.chottoday.com

1. Project `mimane` → **Custom domains** → **Set up a custom domain**.
2. Nhập `mimane.chottoday.com` → **Continue** → **Activate domain**.
   Vì zone `chottoday.com` nằm cùng tài khoản Cloudflare, bản ghi CNAME
   `mimane → mimane.pages.dev` được tạo tự động. Chứng chỉ SSL có sau vài phút.
3. Không cần sửa gì trong project chottoday.

## 3. Kiểm tra sau deploy

- `https://mimane.chottoday.com/?lang=vi` mở onboarding tiếng Việt.
- Mở một bài, bấm phát: audio chạy, câu đang đọc được tô sáng.
- Tải lại trang ngay trên `/lesson/...`: vẫn mở đúng bài. Pages **không** tự
  fallback SPA nữa vì có `public/404.html`; các route thật được viết lại về
  `index.html` trong `public/_redirects`. Thêm `<Route>` mới vào
  `src/app/App.tsx` thì thêm dòng tương ứng ở `_redirects`, nếu không route đó
  trả 404 khi tải lại. Đường dẫn lạ (`/abc`, `/.env`) trả 404 thật.
- Nút ghi âm hỏi quyền micro (header `Permissions-Policy: microphone=(self)`).
- Thêm bài tiếng Nhật bằng phụ đề dán vào: từ điển `/dict/*.dat.bin` tải được và
  có furigana.

## 4. Sau khi mimane.chottoday.com chạy

Trong repo chottoday, nhánh `app/mimane` đã có commit thêm Mimane vào
`src/data/apps.js` và `public/apps/mimane.svg` (test, validate, build đều
sạch). Push nhánh, mở PR, merge vào `main` → chottoday.com tự deploy.
**Đừng merge trước bước 2**, nếu không mọi trang chottoday sẽ có một liên kết chết.

## Ghi chú

- **Giới hạn Pages:** 25 MiB mỗi file. Bản build ~31 MB / 58 file, file lớn nhất
  ~6 MB. Runtime ONNX 26 MB của Whisper-trong-trình-duyệt không đóng gói mà tải
  từ jsDelivr lúc chạy (`vite.config.ts`, plugin `dropBundledOrtWasm`).
- **Preview:** mỗi nhánh khác `main` có địa chỉ `<nhánh>.mimane.pages.dev`.
- **Transcriber** (`npm run transcriber`) chạy trên máy người học, không deploy.
  Nó cho phép gọi từ `https://mimane.chottoday.com` và `*.mimane.pages.dev`, và trả
  header Private Network Access cho Chrome. Chrome, Edge, Firefox gọi được
  `http://127.0.0.1:8778` từ trang HTTPS; Safari có thể chặn — khi đó dùng Chrome
  hoặc chạy app ở `localhost` (`npm run dev`).
- Deploy tay không qua Git (nếu cần): `npm run build && npx wrangler pages deploy dist --project-name mimane`.
