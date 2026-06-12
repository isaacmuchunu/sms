import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  indigo: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    trendUp: 'text-primary-700 bg-primary-100',
    trendDown: 'text-primary-700 bg-primary-100',
  },
  emerald: {
    bg: 'bg-secondary-50',
    icon: 'text-secondary-600',
    trendUp: 'text-secondary-700 bg-secondary-100',
    trendDown: 'text-secondary-700 bg-secondary-100',
  },
  amber: {
    bg: 'bg-warning-50',
    icon: 'text-warning-600',
    trendUp: 'text-warning-700 bg-warning-100',
    trendDown: 'text-warning-700 bg-warning-100',
  },
  red: {
    bg: 'bg-danger-50',
    icon: 'text-danger-600',
    trendUp: 'text-danger-700 bg-danger-100',
    trendDown: 'text-danger-700 bg-danger-100',
  },
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'indigo',
  className,
}) => {
  const colors = colorMap[color] || colorMap.indigo;
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <div
      className={clsx(
        'rounded-xl bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            colors.bg
          )}
        >
          {Icon && <Icon className={clsx('h-6 w-6', colors.icon)} />}
        </div>

        {/* Trend Badge */}
        {trend !== undefined && trend !== null && (
          <div
            className={clsx(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              isPositiveTrend
                ? colors.trendUp
                : isNegativeTrend
                ? colors.trendDown
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
            {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
            <span>
              {isPositiveTrend && '+'}
              {trend}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-gray-500">{title}</p>
      </div>
    </div>
  );
};

export default StatCard;
