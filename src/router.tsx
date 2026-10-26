import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { ReviewPage } from './pages/ReviewPage'
import { CardEditorPage, EditCardRoute } from './pages/CardEditorPage'
import { NotesPage } from './pages/NotesPage'

// The three most used screens ship in the main bundle; the rest load on demand.
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    hydrateFallbackElement: <div />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'record', element: <CardEditorPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'notes/card/:cardId', element: <EditCardRoute /> },
      { path: 'character', lazy: async () => ({ Component: (await import('./pages/CharacterPage')).CharacterPage }) },
      { path: 'stats', lazy: async () => ({ Component: (await import('./pages/StatsPage')).StatsPage }) },
      { path: 'decks', lazy: async () => ({ Component: (await import('./pages/DecksPage')).DecksPage }) },
      { path: 'decks/:deckId', lazy: async () => ({ Component: (await import('./pages/DeckDetailPage')).DeckDetailPage }) },
      { path: 'tags', lazy: async () => ({ Component: (await import('./pages/TagsPage')).TagsPage }) },
      { path: 'tags/:tagId', lazy: async () => ({ Component: (await import('./pages/TagDetailPage')).TagDetailPage }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('./pages/SettingsPage')).SettingsPage }) },
      {
        path: 'settings/languages',
        lazy: async () => ({ Component: (await import('./pages/LanguageOrderPage')).LanguageOrderPage }),
      },
      { path: '*', element: <Navigate to="/review" replace /> },
    ],
  },
], { basename: import.meta.env.BASE_URL })
