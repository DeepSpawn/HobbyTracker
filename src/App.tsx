import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/routes';
import {
  HomePage,
  LoginPage,
  PaintsPage,
  ProfilePage,
  ProjectDetailPage,
  ProjectsPage,
  RecipeDetailPage,
  RecipesPage,
  RegisterPage,
} from './pages';

function App() {
  return (
    <Routes>
      {/* Public routes - redirect to home if authenticated */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes - redirect to login if not authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/paints" element={<PaintsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      </Route>

      {/* Fallback - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
