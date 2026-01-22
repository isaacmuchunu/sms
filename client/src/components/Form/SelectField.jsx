import { useId } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  placeholder = 'Select...',
  disabled = false,
  className,
  helperText,
  ...props
}) => {
  const id = useId();
  const selectId = `${name}-${id}`;

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={clsx(
            'w-full appearance-none rounded-lg border px-3 py-2.5 pr-10 text-sm text-gray-900 transition-colors',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error
              ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500'
              : 'border-gray-300 hover:border-gray-400'
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default SelectField;
