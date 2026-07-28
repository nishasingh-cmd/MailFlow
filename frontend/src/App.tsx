import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';

function App() {
  // Initialize theme hook so dark/light theme class is applied on root
  useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
