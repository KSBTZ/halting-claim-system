import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export const IconInput = ({ id, label, icon: Icon, hint, trailing, className = '', ...props }) => (
  <div className={className}>
    <label htmlFor={id} className="field-label">{label}</label>
    <div className="group relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-600"
        strokeWidth={2.25}
      />
      <input id={id} className={`field-input py-3 pl-11 ${trailing ? 'pr-11' : ''}`} {...props} />
      {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>}
    </div>
    {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const PasswordInput = (props) => {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      icon={Lock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="icon-btn"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
      {...props}
    />
  );
};
