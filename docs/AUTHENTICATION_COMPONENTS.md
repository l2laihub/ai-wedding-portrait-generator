# Authentication Components Documentation

This document describes the authentication components implemented for the AI Wedding Portrait Generator, including Google Sign-In integration and password reset functionality.

## Overview

The authentication system includes:
- **Google OAuth2 Sign-In** - Seamless authentication with Google accounts
- **Password Reset Flow** - Email-based password reset with secure token validation
- **Enhanced LoginModal** - Integrated auth modal with multiple sign-in options
- **TypeScript Support** - Full type safety and intellisense
- **Responsive Design** - Works on desktop and mobile devices
- **Dark Mode** - Consistent with the app's theme system

## Components

### 1. GoogleSignInButton

A reusable Google Sign-In button component with customizable styling and behavior.

```tsx
import GoogleSignInButton from './components/GoogleSignInButton';

<GoogleSignInButton
  onSuccess={() => console.log('Signed in!')}
  onError={(error) => console.error(error)}
  size="md"               // 'sm' | 'md' | 'lg'
  variant="secondary"     // 'primary' | 'secondary'
  fullWidth={true}
  disabled={false}
/>
```

**Props:**
- `onSuccess?: () => void` - Called when sign-in succeeds
- `onError?: (error: string) => void` - Called when sign-in fails
- `disabled?: boolean` - Disables the button
- `size?: 'sm' | 'md' | 'lg'` - Button size variant
- `variant?: 'primary' | 'secondary'` - Button style variant
- `fullWidth?: boolean` - Whether button takes full width
- `className?: string` - Additional CSS classes

### 2. PasswordResetForm

A form component for requesting password reset emails.

```tsx
import PasswordResetForm from './components/PasswordResetForm';

<PasswordResetForm
  onSuccess={() => console.log('Email sent!')}
  onCancel={() => console.log('Cancelled')}
  standalone={true}
/>
```

**Props:**
- `onSuccess?: () => void` - Called when email is sent successfully
- `onCancel?: () => void` - Called when user cancels
- `className?: string` - Additional CSS classes
- `standalone?: boolean` - Whether to show as standalone component with styling

**Features:**
- Email validation
- Loading states
- Success/error messaging
- Resend functionality
- Responsive design

### 3. PasswordResetConfirmation

A component for setting a new password after clicking a reset link.

```tsx
import PasswordResetConfirmation from './components/PasswordResetConfirmation';

<PasswordResetConfirmation
  onSuccess={() => console.log('Password updated!')}
  onCancel={() => console.log('Cancelled')}
  standalone={true}
/>
```

**Props:**
- `onSuccess?: () => void` - Called when password is updated
- `onCancel?: () => void` - Called when user cancels
- `className?: string` - Additional CSS classes
- `standalone?: boolean` - Whether to show as standalone component

**Features:**
- Token validation from URL parameters
- Password strength indicator
- Real-time validation
- Show/hide password toggles
- Confirmation password matching

### 4. Enhanced LoginModal

The existing LoginModal has been enhanced with Google Sign-In and improved password reset flow.

```tsx
import LoginModal from './components/LoginModal';

<LoginModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(user) => console.log('Logged in:', user)}
  defaultMode="signin"    // 'signin' | 'signup'
  title="Custom Title"
  subtitle="Custom Subtitle"
/>
```

**New Features:**
- Integrated Google Sign-In button
- Enhanced password reset form
- Better error handling
- Improved accessibility

### 5. PasswordResetPage

A standalone page component for handling password reset confirmations.

```tsx
import PasswordResetPage from './components/PasswordResetPage';

<PasswordResetPage
  navigate={(route) => console.log('Navigate to:', route)}
  onComplete={() => console.log('Reset complete')}
/>
```

## Hooks

### useGoogleAuth

A hook for managing Google OAuth authentication.

```tsx
import { useGoogleAuth } from './hooks/useGoogleAuth';

const { signIn, isLoading, error, clearError } = useGoogleAuth({
  onSuccess: () => console.log('Success!'),
  onError: (error) => console.error(error)
});
```

### usePasswordReset

A hook for managing password reset flow.

```tsx
import { usePasswordReset } from './hooks/usePasswordReset';

const {
  requestReset,
  requestLoading,
  requestError,
  confirmReset,
  confirmLoading,
  isValidToken
} = usePasswordReset({
  onSuccess: () => console.log('Success!')
});
```

## Types

The system includes comprehensive TypeScript types in `/types/auth.ts`:

- `GoogleUser` - Google user information
- `AuthError` - Authentication error details
- `AuthCallbackParams` - OAuth callback parameters
- `PasswordStrength` - Password strength indicators
- `AuthModalState` - Modal state management
- `AuthFormData` - Form data structures

## Utilities

Utility functions are available in `/utils/authUtils.ts`:

- `calculatePasswordStrength(password)` - Analyzes password strength
- `parseAuthCallback()` - Parses OAuth callback parameters
- `clearAuthCallback()` - Cleans URL after OAuth
- `formatAuthError(error)` - Formats errors for display
- `isValidEmail(email)` - Validates email format

## Integration with Existing System

### Authentication Service

All components integrate with the existing `authService` in `/services/authService.ts`:

- `signInWithGoogle()` - Google OAuth flow
- `resetPassword(email)` - Request reset email
- `updatePassword(newPassword)` - Update user password

### Router Integration

The Router component has been updated to handle password reset routes:

- `/reset-password` - Password reset confirmation page
- Hash-based routing with `type=recovery` support

### Supabase Integration

The system works with Supabase authentication:

- Google OAuth provider configuration
- Email-based password reset
- Secure token validation
- Session management

## Usage Examples

### Basic Google Sign-In

```tsx
function MyComponent() {
  const handleSuccess = () => {
    console.log('User signed in with Google!');
    // Handle successful authentication
  };

  const handleError = (error: string) => {
    console.error('Google sign-in failed:', error);
    // Handle authentication error
  };

  return (
    <GoogleSignInButton
      onSuccess={handleSuccess}
      onError={handleError}
      size="lg"
      variant="primary"
    />
  );
}
```

### Password Reset Flow

```tsx
function ResetPassword() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');

  return (
    <div>
      {step === 'request' ? (
        <PasswordResetForm
          onSuccess={() => setStep('confirm')}
          standalone={true}
        />
      ) : (
        <PasswordResetConfirmation
          onSuccess={() => console.log('Password updated!')}
          onCancel={() => setStep('request')}
          standalone={true}
        />
      )}
    </div>
  );
}
```

### Enhanced Login Modal

```tsx
function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div>
      <button onClick={() => setShowLogin(true)}>
        Sign In
      </button>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={(user) => {
          console.log('Welcome:', user);
          setShowLogin(false);
        }}
        defaultMode="signin"
      />
    </div>
  );
}
```

## Demo Component

A comprehensive demo component is available at `/components/AuthDemo.tsx` that showcases all authentication components and their features.

## Security Considerations

1. **Token Validation** - Reset tokens are validated client and server-side
2. **Password Strength** - Enforced minimum requirements with visual feedback
3. **Error Handling** - Secure error messages that don't leak sensitive information
4. **HTTPS Required** - All authentication flows require secure connections
5. **Session Management** - Proper session handling with Supabase

## Browser Support

- Modern browsers with ES2017+ support
- Google OAuth requires third-party cookies enabled
- Progressive enhancement for accessibility

## Accessibility Features

- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus management in modals
- ARIA labels and descriptions

## Customization

All components support:
- Custom CSS classes
- Theme integration (light/dark mode)
- Custom error messages
- Configurable button variants
- Responsive breakpoints

## Testing

Components include:
- TypeScript type checking
- Error boundary support
- Loading state management
- Network error handling
- Token expiration handling

For development and testing, use the `AuthDemo` component to interact with all authentication features.
