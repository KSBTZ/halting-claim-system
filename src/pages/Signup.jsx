import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, BadgeCent, Briefcase, Hash, Mail, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { IconInput, PasswordInput } from '../components/AuthFields';
import { Alert, Spinner } from '../components/ui';

const generateCaptchaCode = () => Math.floor(10000 + Math.random() * 90000).toString();

const Signup = () => {
  // Form state
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState('');
  const [staffNumber, setStaffNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [captchaCode, setCaptchaCode] = useState(generateCaptchaCode);
  const [captchaInput, setCaptchaInput] = useState('');

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptchaCode());
    setCaptchaInput('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    if (!fullName || !department || !grade || !staffNumber || !email) {
      setError('Please fill in all fields.');
      return;
    }

    const staffIdPattern = /^SIC\d{5}$/;
    if (!staffIdPattern.test(staffNumber)) {
      setError('Staff ID must be in the format SIC followed by exactly 5 digits (e.g. SIC12345).');
      return;
    }

    if (captchaInput !== captchaCode) {
      setError('Incorrect captcha code. Please try again.');
      refreshCaptcha();
      return;
    }

    setLoading(true);

    const { data: staffIdTaken, error: staffIdCheckError } = await supabase
      .rpc('is_staff_no_taken', { input_staff_no: staffNumber });

    if (staffIdCheckError) {
      setError('Could not verify Staff ID. Please try again.');
      setLoading(false);
      return;
    }

    if (staffIdTaken) {
      setError('This Staff ID is already registered. Please contact your admin if you believe this is a mistake.');
      setLoading(false);
      return;
    }

    // 1. Create the user in Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department: department,
          grade: grade,
          staff_number: staffNumber,
          role: 'employee', // Default role for new signups
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Insert into the profiles table, which holds the user's role
    if (data?.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          staff_name: fullName,
          department: department,
          grade: grade,
          staff_no: staffNumber,
          role: 'employee'
        }
      ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    setLoading(false);

    // Send them to the employee dashboard upon successful creation
    navigate('/employee/new-claim');
  };

  return (
    <AuthLayout title="Create your account" subtitle="Register as an employee to start submitting halting claims.">
      <form className="space-y-5" onSubmit={handleSignup} noValidate>
        <IconInput
          id="signup-name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => {
            const value = e.target.value;
            setFullName(value.charAt(0).toUpperCase() + value.slice(1));
          }}
          placeholder="e.g. Ama Mensah"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <IconInput
            id="signup-department"
            label="Department"
            icon={Briefcase}
            type="text"
            autoComplete="organization-title"
            value={department}
            onChange={(e) => setDepartment(e.target.value.toUpperCase())}
            placeholder="e.g. FINANCE"
          />
          <IconInput
            id="signup-grade"
            label="Grade"
            icon={BadgeCent}
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value.toUpperCase())}
            placeholder="e.g. G6"
          />
        </div>

        <IconInput
          id="signup-staff-no"
          label="Staff number"
          icon={Hash}
          type="text"
          autoCapitalize="characters"
          spellCheck={false}
          value={staffNumber}
          onChange={(e) => setStaffNumber(e.target.value.toUpperCase())}
          placeholder="SIC12345"
          hint="SIC followed by exactly 5 digits. You can use it to log in."
        />

        <IconInput
          id="signup-email"
          label="Work email"
          icon={Mail}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sic-life.com"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PasswordInput
            id="signup-password"
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <PasswordInput
            id="signup-confirm-password"
            label="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {/* Captcha */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" strokeWidth={2.5} />
            <label htmlFor="signup-captcha" className="text-xs font-semibold text-gray-700">Quick check: type the numbers you see</label>
          </div>
          <div className="flex items-stretch gap-2">
            <div
              className="flex flex-1 select-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(24,87,0,0.06) 0px, rgba(24,87,0,0.06) 2px, transparent 2px, transparent 8px)' }}
              aria-hidden="true"
            >
              {captchaCode.split('').map((digit, i) => (
                <span
                  key={i}
                  className="inline-block font-heading text-xl font-extrabold text-brand-800"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (8 + i * 2)}deg)` }}
                >
                  {digit}
                </span>
              ))}
            </div>
            <button type="button" onClick={refreshCaptcha} className="icon-btn border border-gray-200 bg-white px-3 hover:text-brand-700" aria-label="Show new numbers" title="Show new numbers">
              <RefreshCw className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </button>
            <input
              id="signup-captcha"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="field-input tabular w-28 text-center text-lg font-semibold tracking-[0.2em] sm:w-32"
              placeholder="Code"
            />
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? (
            <>
              <Spinner className="h-5 w-5" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </>
          )}
        </button>

        <p className="pt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
