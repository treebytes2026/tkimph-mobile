import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { pointerEvents, style, ...pressableProps } = props as BottomTabBarButtonProps & {
    pointerEvents?: ViewStyle['pointerEvents'];
  };

  return (
    <PlatformPressable
      {...pressableProps}
      android_ripple={{ color: 'transparent' }}
      pressColor="transparent"
      pressOpacity={1}
      onHoverIn={(ev) => {
        setHovered(true);
        props.onHoverIn?.(ev);
      }}
      onHoverOut={(ev) => {
        setHovered(false);
        props.onHoverOut?.(ev);
      }}
      onPressIn={(ev) => {
        setPressed(true);
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPressOut={(ev) => {
        setPressed(false);
        props.onPressOut?.(ev);
      }}
      style={[
        style,
        pointerEvents ? { pointerEvents } : null,
        styles.tabButton,
        (hovered || pressed) && styles.tabButtonHover,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tabButton: {
    borderRadius: 0,
  },
  tabButtonHover: {
    backgroundColor: 'transparent',
  },
});
