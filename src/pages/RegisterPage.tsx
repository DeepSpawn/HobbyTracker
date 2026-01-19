import { useNavigate } from 'react-router-dom';
import { AuthLayout, RegisterForm, GoogleSignInButton } from '../components/auth';

/**
 * Registration page with email/password and Google sign-in options
 */
export function RegisterPage() {
  const navigate = useNavigate();

  // Navigate to home after successful registration
  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your hobby projects today"
    >
      <RegisterForm onSuccess={handleSuccess} />

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
