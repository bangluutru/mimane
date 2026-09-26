import type { Localized } from '@/languages/types';

export type CategoryId =
  | 'daily-life' | 'travel' | 'work-business' | 'science' | 'technology' | 'health'
  | 'nature' | 'culture' | 'history' | 'art' | 'music' | 'entertainment' | 'food'
  | 'education' | 'sports' | 'family' | 'news-society' | 'philosophy' | 'lifestyle' | 'other';

export interface Category { id: CategoryId; label: Localized & { en: string } }

/** Stable taxonomy. Tags are free-form; categories are not. */
export const CATEGORIES: Category[] = [
  { id: 'daily-life', label: { en: 'Daily Life', vi: 'Đời sống', ja: '日常生活' } },
  { id: 'travel', label: { en: 'Travel', vi: 'Du lịch', ja: '旅行' } },
  { id: 'work-business', label: { en: 'Work & Business', vi: 'Công việc – Kinh doanh', ja: '仕事・ビジネス' } },
  { id: 'science', label: { en: 'Science', vi: 'Khoa học', ja: '科学' } },
  { id: 'technology', label: { en: 'Technology', vi: 'Công nghệ', ja: 'テクノロジー' } },
  { id: 'health', label: { en: 'Medicine & Health', vi: 'Y tế – Sức khỏe', ja: '医療・健康' } },
  { id: 'nature', label: { en: 'Nature & Environment', vi: 'Thiên nhiên – Môi trường', ja: '自然・環境' } },
  { id: 'culture', label: { en: 'Culture', vi: 'Văn hóa', ja: '文化' } },
  { id: 'history', label: { en: 'History', vi: 'Lịch sử', ja: '歴史' } },
  { id: 'art', label: { en: 'Art', vi: 'Nghệ thuật', ja: 'アート' } },
  { id: 'music', label: { en: 'Music', vi: 'Âm nhạc', ja: '音楽' } },
  { id: 'entertainment', label: { en: 'Film & Entertainment', vi: 'Điện ảnh – Giải trí', ja: '映画・エンタメ' } },
  { id: 'food', label: { en: 'Food', vi: 'Ẩm thực', ja: '食べ物' } },
  { id: 'education', label: { en: 'Education', vi: 'Giáo dục', ja: '教育' } },
  { id: 'sports', label: { en: 'Sports', vi: 'Thể thao', ja: 'スポーツ' } },
  { id: 'family', label: { en: 'Family & Parenting', vi: 'Gia đình', ja: '家族・子育て' } },
  { id: 'news-society', label: { en: 'News & Society', vi: 'Tin tức – Xã hội', ja: 'ニュース・社会' } },
  { id: 'philosophy', label: { en: 'Philosophy & Ideas', vi: 'Tư tưởng – Triết học', ja: '思想・哲学' } },
  { id: 'lifestyle', label: { en: 'Lifestyle', vi: 'Lối sống', ja: 'ライフスタイル' } },
  { id: 'other', label: { en: 'Other', vi: 'Khác', ja: 'その他' } },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Topics featured on Home ("Explore topics"). */
export const FEATURED_TOPICS: CategoryId[] = [
  'science', 'art', 'culture', 'technology', 'work-business', 'health', 'travel', 'food', 'daily-life', 'entertainment',
];
