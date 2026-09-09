import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[16px] font-semibold transition-all outline-none active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]',
  {
    variants: {
      variant: {
        default:
          'bg-[#0066cc] text-white hover:bg-[#0071e3]',
        secondary:
          'border border-[#424245] bg-[#1d1d1f] text-white hover:border-[#66666a] hover:bg-[#272729]',
        ghost: 'text-[#cccccc] hover:bg-[#1d1d1f] hover:text-white',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-11 px-4 text-[14px]',
        icon: 'size-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
