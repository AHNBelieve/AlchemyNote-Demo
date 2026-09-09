import type { ContextColor, ProjectTheme } from '@/lib/living-context';

export interface ContextColorStyle {
  label: string;
  accent: string;
  strong: string;
  soft: string;
  border: string;
  rgb: string;
}

export const contextColorStyles: Record<ContextColor, ContextColorStyle> = {
  green: { label: 'Green', accent: '#77e6a4', strong: '#39c875', soft: 'rgba(119, 230, 164, .10)', border: 'rgba(119, 230, 164, .26)', rgb: '119, 230, 164' },
  blue: { label: 'Blue', accent: '#79a9ff', strong: '#4f82e8', soft: 'rgba(121, 169, 255, .10)', border: 'rgba(121, 169, 255, .26)', rgb: '121, 169, 255' },
  violet: { label: 'Violet', accent: '#ad91ff', strong: '#8163e8', soft: 'rgba(173, 145, 255, .10)', border: 'rgba(173, 145, 255, .26)', rgb: '173, 145, 255' },
  amber: { label: 'Amber', accent: '#f2bd68', strong: '#d89532', soft: 'rgba(242, 189, 104, .10)', border: 'rgba(242, 189, 104, .26)', rgb: '242, 189, 104' },
  cyan: { label: 'Cyan', accent: '#63d7e7', strong: '#35adbd', soft: 'rgba(99, 215, 231, .10)', border: 'rgba(99, 215, 231, .26)', rgb: '99, 215, 231' },
  rose: { label: 'Rose', accent: '#f08da8', strong: '#d35d7d', soft: 'rgba(240, 141, 168, .10)', border: 'rgba(240, 141, 168, .26)', rgb: '240, 141, 168' },
};

export function getContextColor(colorKey?: ContextColor) {
  return contextColorStyles[colorKey ?? 'violet'];
}

const legacyThemeMap: Record<ProjectTheme, ContextColor> = {
  forest: 'green',
  indigo: 'violet',
  ocean: 'cyan',
  sunset: 'rose',
  clay: 'amber',
  plum: 'violet',
};

/** @deprecated Use getContextColor. */
export function getProjectTheme(theme?: ProjectTheme) {
  const style = getContextColor(theme ? legacyThemeMap[theme] : 'violet');
  return {
    ...style,
    text: style.accent,
    gradient: `linear-gradient(145deg, ${style.soft}, rgba(17,17,19,.96))`,
    vivid: style.accent,
  };
}
