import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, User } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { queryClient } from '../lib/queryClient';
import AuthLayout from '../components/AuthLayout';
import { IconInput, PasswordInput } from '../components/AuthFields';
import { Alert, Spinner } from '../components/ui';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let loginEmail = email.trim();

    // If it's not an email, treat it as a Staff ID and look up the matching email
    if (!loginEmail.includes('@')) {
      const staffIdPattern = /^SIC\d{5}$/i;

      if (!staffIdPattern.test(loginEmail)) {
        setError('Enter a valid email or Staff ID (e.g. SIC12345).');
        setLoading(false);
        return;
      }

      const { data: matchedEmail, error: lookupError } = await supabase
        .rpc('get_email_by_staff_no', { input_staff_no: loginEmail.toUpperCase() });

      if (lookupError || !matchedEmail) {
        setError('Invalid login details');
        setLoading(false);
        return;
      }

      loginEmail = matchedEmail;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      setError('Invalid login details');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setError('Could not find your profile');
      return;
    }

    // Start with a clean cache so nothing from a previous account shows
    queryClient.clear();

    if (profile.role === 'manager') {
      navigate('/manager/inbox');
    } else {
      navigate('/employee/new-claim');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in with your email address or Staff ID.">
      <form className="space-y-5" onSubmit={handleLogin} noValidate>
        <IconInput
          id="login-id"
          label="Email or Staff ID"
          icon={User}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sic-life.com or SIC12345"
        />

        <PasswordInput
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? (
            <>
              <Spinner className="h-5 w-5" />
              Signing in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </>
          )}
        </button>

        <p className="pt-2 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
