import { Navigate, createBrowserRouter } from 'react-router-dom';
import Admin from './pages/Admin';
import CaseView from './pages/CaseView';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SharedCase from './pages/SharedCase';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/cases/:id',
    element: <CaseView />,
  },
  {
    path: '/shared/:token',
    element: <SharedCase />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
