import type { Localized } from '@/languages/types';

export type CategoryId =
  | 'daily-life' | 'travel' | 'work-business' | 'science' | 'technology' | 'health'
  | 'nature' | 'culture' | 'history' | 'art' | 'music' | 'entertainment' | 'food'
  | 'education' | 'sports' | 'family' | 'news-society' | 'philosophy' | 'lifestyle' | 'other';

export interface Category { id: CategoryId; icon: string; label: Localized & { en: string } }

/** Stable taxonomy. Tags are free-form; categories are not. */
export const CATEGORIES: Category[] = [
  { id: 'daily-life', icon: '🏠', label: { en: 'Daily Life', vi: 'Đời sống', ja: '日常生活' } },
  { id: 'travel', icon: '✈️', label: { en: 'Travel', vi: 'Du lịch', ja: '旅行' } },
  { id: 'work-business', icon: '💼', label: { en: 'Work & Business', vi: 'Công việc – Kinh doanh', ja: '仕事・ビジネス' } },
  { id: 'science', icon: '🔬', label: { en: 'Science', vi: 'Khoa học', ja: '科学' } },
  { id: 'technology', icon: '💻', label: { en: 'Technology', vi: 'Công nghệ', ja: 'テクノロジー' } },
  { id: 'health', icon: '🩺', label: { en: 'Medicine & Health', vi: 'Y tế – Sức khỏe', ja: '医療・健康' } },
  { id: 'nature', icon: '🌿', label: { en: 'Nature & Environment', vi: 'Thiên nhiên – Môi trường', ja: '自然・環境' } },
  { id: 'culture', icon: '🌏', label: { en: 'Culture', vi: 'Văn hóa', ja: '文化' } },
  { id: 'history', icon: '📜', label: { en: 'History', vi: 'Lịch sử', ja: '歴史' } },
  { id: 'art', icon: '🎨', label: { en: 'Art', vi: 'Nghệ thuật', ja: 'アート' } },
  { id: 'music', icon: '🎵', label: { en: 'Music', vi: 'Âm nhạc', ja: '音楽' } },
  { id: 'entertainment', icon: '🎬', label: { en: 'Film & Entertainment', vi: 'Điện ảnh – Giải trí', ja: '映画・エンタメ' } },
  { id: 'food', icon: '🍜', label: { en: 'Food', vi: 'Ẩm thực', ja: '食べ物' } },
  { id: 'education', icon: '🎓', label: { en: 'Education', vi: 'Giáo dục', ja: '教育' } },
  { id: 'sports', icon: '⚽', label: { en: 'Sports', vi: 'Thể thao', ja: 'スポーツ' } },
  { id: 'family', icon: '👨‍👩‍👧', label: { en: 'Family & Parenting', vi: 'Gia đình', ja: '家族・子育て' } },
  { id: 'news-society', icon: '📰', label: { en: 'News & Society', vi: 'Tin tức – Xã hội', ja: 'ニュース・社会' } },
  { id: 'philosophy', icon: '💭', label: { en: 'Philosophy & Ideas', vi: 'Tư tưởng – Triết học', ja: '思想・哲学' } },
  { id: 'lifestyle', icon: '☕', label: { en: 'Lifestyle', vi: 'Lối sống', ja: 'ライフスタイル' } },
  { id: 'other', icon: '✨', label: { en: 'Other', vi: 'Khác', ja: 'その他' } },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Topics featured on Home ("Explore topics"). */
export const FEATURED_TOPICS: CategoryId[] = [
  'science', 'art', 'culture', 'technology', 'work-business', 'health', 'travel', 'food', 'daily-life', 'entertainment',
];
