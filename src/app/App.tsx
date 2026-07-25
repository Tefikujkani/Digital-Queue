import { RouterProvider } from 'react-router';
import { router } from './routes';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { QueueProvider } from './contexts/QueueContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ThemeProvider } from 'next-themes';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <FavoritesProvider>
              <QueueProvider>
                <RouterProvider router={router} />
              </QueueProvider>
            </FavoritesProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
