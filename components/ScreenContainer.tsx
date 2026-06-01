import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ParticleField } from './ParticleField';
import { AuraOrb } from './AuraOrb';
import { theme, type AuraColourKey } from '@/constants/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle | ViewStyle[];
  particles?: boolean;
  orb?: boolean;
  orbColour?: AuraColourKey;
  orbSecondary?: AuraColourKey;
}

export function ScreenContainer({
  children,
  scroll = true,
  contentStyle,
  particles = true,
  orb = true,
  orbColour = 'Violet',
  orbSecondary = 'Blue',
}: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#050507', '#0A0A12', '#050507']}
        style={StyleSheet.absoluteFill}
      />
      {orb && (
        <View pointerEvents="none" style={styles.orbWrap}>
          <AuraOrb size={420} colour={orbColour} secondary={orbSecondary} intensity={0.6} />
        </View>
      )}
      {particles && <ParticleField />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.obsidian },
  safe: { flex: 1 },
  orbWrap: {
    position: 'absolute',
    top: -60,
    right: -120,
    opacity: 0.85,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
    // Cap content width so desktop browsers don't stretch screens edge-to-edge.
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
});
