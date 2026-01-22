import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

/**
 * User profile page with account info and logout
 */
export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      // Error handled by AuthContext
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Profile</h1>

        <Card variant="elevated" padding="lg">
          <Card.Body>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <span className="text-xl font-semibold">
                    {user.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}

              {/* User info */}
              <div className="flex-1">
                {user.displayName && (
                  <h2 className="text-lg font-semibold text-gray-900">
                    {user.displayName}
                  </h2>
                )}
                <p className="text-gray-600">{user.email}</p>
                {user.emailVerified ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-sm text-success">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Email verified
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 text-sm text-warning">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Email not verified
                  </span>
                )}
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Actions */}
            <div className="flex justify-end">
              <Button
                variant="danger"
                onClick={handleSignOut}
                isLoading={isSigningOut}
              >
                Sign out
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
