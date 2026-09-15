import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ui/Toast/Toast';

function App() {
  useTheme();

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
