import type { LessonMeta } from '@/domains/lesson/types';
import type { LessonProgress } from '@/domains/progress/types';
import { levelRank } from '@/languages/proficiency';
import type { LearnerProfile } from '@/domains/user/profile';

export interface Recommendation {
  lesson: LessonMeta;
  score: number;
  reasons: ('level' | 'interest' | 'new' | 'topic-history')[];
}

export interface Recommender {
  recommend(lessons: LessonMeta[], profile: LearnerProfile, progress: LessonProgress[], limit?: number): Recommendation[];
}

/**
 * Deterministic scorer: target language + level fit + interests + history.
 * An AI/collaborative recommender can implement the same interface later.
 */
export const heuristicRecommender: Recommender = {
  recommend(lessons, profile, progress, limit = 8) {
    const lang = profile.targetLanguage;
    const byId = new Map(progress.map((p) => [p.lessonId, p]));
    // Topics the learner actually spent time on
    const topicTime = new Map<string, number>();
    for (const l of lessons) {
      const p = byId.get(l.id);
      if (!p) continue;
      for (const c of l.categories) topicTime.set(c, (topicTime.get(c) ?? 0) + p.listenedMs + p.shadowedMs);
    }
    const userLevel = profile.levels[lang];

    return lessons
      // in-progress lessons already live in "Continue learning"
      .filter((l) => l.targetLanguage === lang && !byId.get(l.id))
      .map((lesson) => {
        const reasons: Recommendation['reasons'] = [];
        let score = 0;
        if (lesson.difficulty && userLevel) {
          const d = levelRank(lesson.difficulty) - levelRank({ framework: lesson.difficulty.framework, level: userLevel });
          // best: at level or one above (i+1); easier is fine, much harder is not
          const fit = d === 0 || d === 1 ? 3 : d === -1 ? 2 : d === 2 ? 1 : d < -1 ? 0.5 : -1;
          score += fit;
          if (fit >= 2) reasons.push('level');
        }
        const interest = lesson.categories.filter((c) => profile.interests.includes(c)).length;
        if (interest) {
          score += 2 + interest * 0.5;
          reasons.push('interest');
        }
        if (lesson.categories.some((c) => (topicTime.get(c) ?? 0) > 60_000)) {
          score += 1;
          reasons.push('topic-history');
        }
        if (!reasons.length) reasons.push('new');
        return { lesson, score, reasons };
      })
      .sort((a, b) => b.score - a.score || a.lesson.durationSec - b.lesson.durationSec)
      .slice(0, limit);
  },
};
