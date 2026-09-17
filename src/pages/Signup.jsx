import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Mail, Briefcase, Hash, BadgeCent, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import logo from '../assets/logos.jpeg';
import manBg from '../assets/man.jpeg';

const generateCaptchaCode = () => Math.floor(10000 + Math.random() * 90000).toString();

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  const [captchaCode, setCaptchaCode] = useState(generateCaptchaCode());
  const [captchaInput, setCaptchaInput] = useState('');

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

    const { data: staffIdTaken, error: staffIdCheckError } = await supabase
      .rpc('is_staff_no_taken', { input_staff_no: staffNumber });

    if (staffIdCheckError) {
      setError('Could not verify Staff ID. Please try again.');
      return;
    }

    if (staffIdTaken) {
      setError('This Staff ID is already registered. Please contact your admin if you believe this is a mistake.');
      return;
    }

    if (captchaInput !== captchaCode) {
      setError('Incorrect captcha code. Please try again.');
      setCaptchaCode(generateCaptchaCode());
      setCaptchaInput('');
      return;
    }

    setLoading(true);

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

    // 2. Insert into your custom profiles table (if you are managing roles there)
    // Note: If you use Supabase triggers to auto-create profiles, you can skip this step!
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
        <div className="flex min-h-screen w-full bg-white font-body antialiased animate-fadeIn">
      
      {/* Left Panel - Branding (Identical to Login) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center px-16 xl:px-24 overflow-hidden z-10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-cover bg-center filter blur-[3px] scale-105" style={{ backgroundImage: `url(${manBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1128]/90 via-[#0a1128]/70 to-[#1e3a8a]/50" />
        <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden opacity-60">
          <svg className="w-full h-full" viewBox="0 0 800 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-100,200 C150,-100 350,700 900,100" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
            <path d="M-50,600 C200,900 500,-100 900,400" fill="none" stroke="#227005" strokeWidth="3" opacity="0.8" />
            <path d="M200,-100 C100,300 700,500 800,900" fill="none" stroke="#FFF700" strokeWidth="2" opacity="0.7" />
            <path d="M100,800 C300,900 400,300 600,400 S700,800 1000,600" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>
        <div className="relative z-20">
          <div className="mb-10">
            <img src={logo} alt="SIC Life" className="h-32 lg:h-40 w-auto object-contain drop-shadow-xl" />
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

      {/* Right Panel - Signup Form (Scrollable due to form length) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 sm:px-16 relative z-0 bg-[#185700] overflow-hidden">
        
        {/* Solid Yellow Corner Squares */}
        <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-[#FFF700] shadow-sm z-0" />
        <div className="absolute bottom-0 left-0 w-24 h-24 lg:w-32 lg:h-32 bg-[#FFF700] shadow-sm z-0" />

        {/* Form Container */}
        <div className="w-full max-w-[500px] relative z-10 max-h-screen py-10 overflow-y-auto no-scrollbar">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-[2.2rem] font-heading font-bold text-white mb-2 tracking-wide drop-shadow-sm">
              Create Account
            </h2>
            <p className="text-gray-200 opacity-90">Register as a new employee to submit claims.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            
            {/* Full Name */}
            <div className="relative transition-all duration-300 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  const value = e.target.value;
                  setFullName(value.charAt(0).toUpperCase() + value.slice(1));
                }}
                className="block w-full font-body pl-12 pr-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm"
                placeholder="Full Name"
              />
            </div>

            {/* Grid for Dept, Grade, Staff No */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative transition-all duration-300 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value.toUpperCase())} className="block w-full font-body pl-12 pr-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Department" />
              </div>

              <div className="relative transition-all duration-300 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <BadgeCent className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input type="text" value={grade} onChange={(e) => setGrade(e.target.value.toUpperCase())} className="block w-full font-body pl-12 pr-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Grade (e.g. G6)" />
              </div>

              <div className="col-span-2 relative transition-all duration-300 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Hash className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input type="text" value={staffNumber} onChange={(e) => setStaffNumber(e.target.value.toUpperCase())} className="block w-full font-body pl-12 pr-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Staff Number (e.g. SIC12345)" />
              </div>
            </div>

            {/* Email Input */}
            <div className="relative transition-all duration-300 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
              </div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full font-body pl-12 pr-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Email Address" />
            </div>

            {/* Captcha */}
            <div className="flex items-center gap-3">
              <div
                className="flex-1 flex items-center justify-center gap-1 bg-white/90 rounded-xl py-3 select-none"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 2px, transparent 2px, transparent 8px)' }}
              >
                {captchaCode.split('').map((digit, i) => (
                  <span
                    key={i}
                    className="text-xl font-heading font-bold text-gray-800 tracking-widest"
                    style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (8 + i * 2)}deg)`, display: 'inline-block' }}
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setCaptchaCode(generateCaptchaCode()); setCaptchaInput(''); }}
                className="p-3 bg-white/90 rounded-xl text-gray-500 hover:text-[#227005] transition-colors"
                title="Refresh captcha"
              >
                <RefreshCw className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.5} />
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="block w-full font-body px-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm"
              placeholder="Type the numbers you see above"
            />

            {/* Password Grid (Password & Confirm Password side by side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative transition-all duration-300 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full font-body pl-12 pr-10 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative transition-all duration-300 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[1.15rem] w-[1.15rem] text-gray-400 group-focus-within:text-[#227005] transition-colors" strokeWidth={2.5} />
                </div>
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full font-body pl-12 pr-10 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF700]/60 focus:border-[#FFF700] text-gray-900 placeholder-gray-400 shadow-sm" placeholder="Confirm Password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-600 text-sm text-center font-bold">{error}</p>
              </div>
            )}

            {/* Signup Button */}
            <button type="submit" disabled={loading} className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-black/20 text-base font-body font-bold bg-[#FFF700] text-[#227005] hover:bg-[#d6cf00] hover:text-[#113a02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#317500] transform hover:-translate-y-0.5 transition-all duration-200 mt-2 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            {/* Route back to Login */}
            <div className="text-center pt-2">
              <p className="text-sm text-white/90">
                Already have an account?{' '}
                <Link to="/" className="text-[#FFF700] font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
    </div>
  );
};

export default Signup;