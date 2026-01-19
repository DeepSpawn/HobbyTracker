import { useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout, LoginForm, GoogleSignInButton } from '../components/auth';

interface LocationState {
  from?: {
    pathname: string;
  };
}

/**
 * Login page with email/password and Google sign-in options
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to intended destination after successful login
  const handleSuccess = () => {
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout title="Sign in to your account">
      <LoginForm onSuccess={handleSuccess} />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">or</span>
        </div>
      </div>

      {/* Google sign-in */}
      <GoogleSignInButton onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
