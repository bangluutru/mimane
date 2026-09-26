import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useProfile } from '@/domains/user/profile';
import { flushPlayTime } from '@/domains/progress/repo';
import { Shell } from './Shell';
import { Toaster } from '@/ui/toast';
import { HomePage } from '@/features/home/HomePage';
import { Onboarding } from '@/features/onboarding/Onboarding';

const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const PlayerPage = lazy(() => import('@/features/player/PlayerPage'));
const ReviewPage = lazy(() => import('@/features/review/ReviewPage'));
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'));
const ImportPage = lazy(() => import('@/features/import/ImportPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function Loading() {
  return (
    <div className="center">
      <div className="spin" />
    </div>
  );
}

export function App() {
  const onboarded = useProfile((p) => p.onboarded);
  const ui = useProfile((p) => p.supportLanguage);

  useEffect(() => {
    document.documentElement.lang = ui;
  }, [ui]);

  useEffect(() => {
    const flush = () => document.visibilityState === 'hidden' && flushPlayTime();
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<Loading />}>
        {!onboarded ? (
          <Onboarding />
        ) : (
          <Routes>
            <Route path="/lesson/:id" element={<PlayerPage />} />
            <Route element={<Shell />}>
              <Route index element={<HomePage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
