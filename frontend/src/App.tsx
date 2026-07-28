import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useTheme } from './hooks/useTheme';

function App() {
  // Initialize theme hook so dark/light theme class is applied on root
  useTheme();

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
