import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ParticleField } from './ParticleField';
import { AuraOrb } from './AuraOrb';
import { theme, type AuraColourKey } from '@/constants/theme';

// On web the WebGL shader background sits behind every screen at z=-2,
// so screens render TRANSPARENT and let the shader show through. On
// native we keep the existing layered gradient + orb + particles.
const IS_WEB = Platform.OS === 'web';

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
      {/* A semi-transparent obsidian wash so the WebGL shader (on web) shows
          THROUGH but every screen still reads as dark even if WebGL fails.
          On native this is fully opaque — the shader doesn't run there. */}
      <LinearGradient
        colors={IS_WEB
          ? ['rgba(5,5,7,0.55)', 'rgba(10,10,18,0.62)', 'rgba(5,5,7,0.78)']
          : ['#050507', '#0A0A12', '#050507']}
        style={StyleSheet.absoluteFill}
      />
      {/* Native gets the orb + particles; on web the shader IS the atmosphere. */}
      {!IS_WEB && orb && (
        <View pointerEvents="none" style={styles.orbWrap}>
          <AuraOrb size={420} colour={orbColour} secondary={orbSecondary} intensity={0.6} />
        </View>
      )}
      {!IS_WEB && particles && <ParticleField />}
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
  rootWeb: { backgroundColor: 'transparent' },
  safe: { flex: 1 },
  orbWrap: {
    position: 'absolute',
    top: -60,
    right: -120,
    opacity: 0.85,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl + 24,
    gap: theme.spacing.lg,
    // Cap content width so desktop browsers don't stretch screens edge-to-edge.
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
});
