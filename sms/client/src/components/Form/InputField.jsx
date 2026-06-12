import { useId } from 'react';
import clsx from 'clsx';

const InputField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  className,
  helperText,
  ...props
}) => {
  const id = useId();
  const inputId = `${name}-${id}`;

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={clsx(
          'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-gray-400',
          'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          error
            ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500'
            : 'border-gray-300 hover:border-gray-400'
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default InputField;
