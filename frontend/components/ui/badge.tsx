import React from 'react';
import { RiskLevel, PatientStatus } from '@/lib/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: RiskLevel | PatientStatus | 'default';
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
    let colorClass = 'bg-gray-800 text-gray-300';
    let pulseClass = '';

    switch (variant) {
        case 'critical':
        case 'escalated':
            colorClass = 'bg-[var(--color-critical)]/20 text-[var(--color-critical)] border border-[var(--color-critical)]/50';
            pulseClass = variant === 'critical' ? 'animate-pulse' : '';
            break;
        case 'high':
        case 'critical_watch':
            colorClass = 'bg-[var(--color-high)]/20 text-[var(--color-high)] border border-[var(--color-high)]/50';
            break;
        case 'moderate':
        case 'watch':
            colorClass = 'bg-[var(--color-moderate)]/20 text-[var(--color-moderate)] border border-[var(--color-moderate)]/50';
            break;
        case 'low':
        case 'stable':
            colorClass = 'bg-[var(--color-low)]/20 text-[var(--color-low)] border border-[var(--color-low)]/50';
            break;
    }

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${colorClass} ${pulseClass} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
