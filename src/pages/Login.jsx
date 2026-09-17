import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import logo from '../assets/logos.jpeg';
import manBg from '../assets/man.jpeg';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
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

    if (profile.role === 'manager') {
      navigate('/manager/inbox');
    } else {
      navigate('/employee/new-claim');
    }
  };

  return (
        <div className="flex min-h-screen w-full bg-white font-sans antialiased animate-fadeIn">
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center px-16 xl:px-24 overflow-hidden z-10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.3)]">
        
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-[3px] scale-105"
          style={{ backgroundImage: `url(${manBg})` }}
        />

        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1128]/90 via-[#0a1128]/70 to-[#1e3a8a]/50" />

        {/* Decorative Abstract Lines */}
        <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden opacity-60">
          <svg className="w-full h-full" viewBox="0 0 800 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-100,200 C150,-100 350,700 900,100" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
            <path d="M-50,600 C200,900 500,-100 900,400" fill="none" stroke="#227005" strokeWidth="3" opacity="0.8" />
            <path d="M200,-100 C100,300 700,500 800,900" fill="none" stroke="#FFF700" strokeWidth="2" opacity="0.7" />
            <path d="M100,800 C300,900 400,300 600,400 S700,800 1000,600" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>

        {/* Content sits above the background and lines */}
        <div className="relative z-20">
          <div className="mb-10">
            <img 
              src={logo} 
              alt="SIC Life" 
              className="h-32 lg:h-40 w-auto object-contain drop-shadow-xl" 
            />
          </div>

          <div>
            <h2 className="text-4xl lg:text-5xl leading-tight font-heading font-bold text-white mb-2 tracking-wide drop-shadow-md">
              Halting Claim System
            </h2>
            <p className="text-lg lg:text-xl text-gray-200 max-w-md leading-relaxed opacity-90">
              Submit, review and manage your nightly allowance claims, all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 sm:px-16 relative z-0 bg-[#185700] overflow-hidden">
        
        {/* Solid Yellow Corner Square - Top Right */}
        <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-[#FFF700] shadow-sm z-0" />
        
        {/* Solid Yellow Corner Square - Bottom Left */}
        <div className="absolute bottom-0 left-0 w-24 h-24 lg:w-32 lg:h-32 bg-[#FFF700] shadow-sm z-0" />

        {/* Form Container */}
        <div className="w-full max-w-[420px] relative z-10">
          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-[2.2rem] font-heading font-bold text-white mb-2 tracking-wide drop-shadow-sm">
              Welcome Back
            </h2>
            <p className="text-gray-200 opacity-90">Sign in with your Email/Staff No.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            
            {/* Username / Email Input */}
            <div className="group">
              <div className="relative transition-all duration-300">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full font-body pl-12 pr-4 py-3.5 bg-white border border-transparent rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 transition-all shadow-md"
                                    placeholder="Email or Staff ID"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <div className="relative transition-all duration-300">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full font-body pl-12 pr-12 py-3.5 bg-white border border-transparent rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 transition-all shadow-md"
                  placeholder="Password"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-700 focus:outline-none transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.5} />
                    ) : (
                      <Eye className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-black/20 text-base font-body font-bold bg-[#FFF700] text-[#227005] hover:bg-[#d6cf00] hover:text-[#113a02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFF700] focus:ring-offset-[#317500] transform hover:-translate-y-0.5 transition-all duration-200 mt-4 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
            {/* Route to Signup */}
            <div className="text-center pt-4">
              <p className="text-sm text-white/90">
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#FFF700] font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
    </div>
  );
};

export default Login;