import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function App() {
  // Initialize theme hook so dark/light theme class is applied on root
  useTheme();

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
