import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchBox, type SearchBoxLabels, type SearchItem, type UseSearchBoxOptions } from '@chotto/search';
import { useT } from '@/app/i18n';

/**
 * Chỗ nối duy nhất giữa mimane và gói ô tìm kiếm dùng chung (@chotto/search).
 * Mọi ô tìm kiếm/lọc trong app đi qua hook này. Đừng viết ô riêng: sửa hành
 * vi thì sửa ở gói, mọi site Chotto cùng có.
 *
 * Phần của riêng mimane nằm ở đây: điều hướng bằng react-router, đóng và xoá
 * ô khi đổi trang (`resetKey = pathname`).
 *
 * Từ khoá chỉ nằm trong state. Đừng ghi nó lên URL khi gõ: URL lọt vào lịch
 * sử trình duyệt, thanh địa chỉ và link người ta chép gửi nhau.
 */
export function useMimaneSearch<T extends SearchItem = SearchItem>(opts: UseSearchBoxOptions<T> = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useSearchBox<T>({
    onChoose: (item) => {
      if (!item.href) return;
      if (item.external) window.open(item.href, '_blank', 'noopener,noreferrer');
      else navigate(item.href);
    },
    resetKey: pathname,
    ...opts,
  });
}

/**
 * Chữ giao diện của gói theo ngôn ngữ giao diện của người học. Gói mặc định
 * tiếng Việt; mimane có ba ngôn ngữ nên luôn truyền qua đây.
 */
export function useSearchLabels(extra: SearchBoxLabels = {}): SearchBoxLabels {
  const t = useT();
  return {
    listbox: t('search.listbox'),
    empty: (q: string) => t('search.empty', { q }),
    seeAll: (q: string) => t('search.seeAll', { q }),
    clear: t('search.clear'),
    ...extra,
  };
}
