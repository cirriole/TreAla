export { useAppTheme } from '@/contexts/ThemeContext';

import { useAppTheme } from '@/contexts/ThemeContext';

export function useColorScheme() {
  const { colorScheme } = useAppTheme();
  return colorScheme;
}
