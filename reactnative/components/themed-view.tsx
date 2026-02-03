import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

// On web, props.pointerEvents is deprecated. Use style.pointerEvents instead.
export function ThemedView({ style, lightColor, darkColor, pointerEvents, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // Move pointerEvents into style so it won't be passed as a prop
  const mergedStyle = [
    { backgroundColor },
    pointerEvents ? { pointerEvents } : null,
    style,
  ];

  return <View style={mergedStyle} {...otherProps} />;
}
