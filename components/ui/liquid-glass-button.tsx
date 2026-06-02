// shadcn-style export path. The actual liquid-glass implementation lives
// in components/PremiumButton.tsx (web branch renders the HTML <button>
// with backdrop-filter: url(#container-glass), the exact reference shadow
// stack, and variant tints). This file re-exports it under a name that
// matches the shadcn `components/ui/<name>` convention so future
// `import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"`
// works.

export { PremiumButton as LiquidGlassButton } from '@/components/PremiumButton';
export { PremiumButton as Button } from '@/components/PremiumButton';
export type { ButtonVariant, ButtonSize } from '@/components/PremiumButton';
