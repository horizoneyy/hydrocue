import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const CircleWithoutCollapsable = React.forwardRef((props: any, ref) => {
  const { collapsable, ...rest } = props;
  return <Circle ref={ref} {...rest} />;
});
CircleWithoutCollapsable.displayName = 'CircleWithoutCollapsable';

const AnimatedCircle = Animated.createAnimatedComponent(CircleWithoutCollapsable);

const AnimatedNumber = memo(({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;
    
    anim.setValue(from);
    Animated.timing(anim, {
      toValue: value,
      duration: 600,
      useNativeDriver: false,
    }).start();
    
    const listener = anim.addListener(({ value: v }) => setDisplayValue(Math.round(v)));
    return () => anim.removeListener(listener);
  }, [value, anim]);

  return (
    <Text
      className="text-[40px] font-black tracking-tighter leading-none z-10 text-white"
      style={{
        textShadowColor: 'rgba(3, 105, 161, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      }}
    >
      {displayValue.toLocaleString()}
    </Text>
  );
});
AnimatedNumber.displayName = 'AnimatedNumber';

const CircularProgress = memo(({ progress, target, current }: { progress: number; target: number; current: number }) => {
  // UI Constants
  const size = width * 0.65;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const innerSize = (radius - 8) * 2;

  // PRUNING: Replace state-based Animated.Value with highly efficient useRef references
  const fillAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const bobAnim1 = useRef(new Animated.Value(0)).current;
  const bobAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Progress Spring
    Animated.spring(fillAnim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      useNativeDriver: false,
      friction: 7,
      tension: 40,
    }).start();

    // 2. Continuous Environment Loops
    const animations = [
      Animated.loop(Animated.timing(waveAnim1, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false })),
      Animated.loop(Animated.timing(waveAnim2, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false })),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bobAnim1, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(bobAnim1, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bobAnim2, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(bobAnim2, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      )
    ];

    animations.forEach(anim => anim.start());

    // Memory Leak Prevention: Strict cleanup on unmount
    return () => animations.forEach(anim => anim.stop());
  }, [progress, fillAnim, waveAnim1, waveAnim2, bobAnim1, bobAnim2]);

  // Interpolations
  const strokeDashoffset = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  const waterTranslateY = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [innerSize + 30, -20] });
  const waveTranslateX1 = waveAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -300] });
  const waveTranslateX2 = waveAnim2.interpolate({ inputRange: [0, 1], outputRange: [-300, 0] });
  const bobTranslateY1 = bobAnim1.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] });
  const bobTranslateY2 = bobAnim2.interpolate({ inputRange: [0, 1], outputRange: [2, -2] });

  // Extracted SVG Paths for DRY execution
  const standardWavePath = "M 0 50 Q 75 35 150 50 T 300 50 T 450 50 T 600 50 T 750 50 T 900 50 L 900 120 L 0 120 Z";
  const backWavePath = "M 0 50 Q 75 30 150 50 T 300 50 T 450 50 T 600 50 T 750 50 T 900 50 L 900 120 L 0 120 Z";

  return (
    <View className="items-center justify-center relative my-6 self-center" style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle stroke="#E0F2FE" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" />
          <AnimatedCircle
            stroke="#0369A1" cx={center} cy={center} r={radius} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none"
          />
        </Svg>
      </View>
      <View className="absolute items-center justify-center bg-[#BAE6FD] overflow-hidden rounded-full" style={{ width: innerSize, height: innerSize }}>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: innerSize + 100, transform: [{ translateY: waterTranslateY }] }}>
          <Animated.View style={{ position: 'absolute', top: -50, width: 900, height: 120, left: 0, transform: [{ translateX: waveTranslateX2 }, { translateY: bobTranslateY2 }] }}>
            <Svg width={900} height={120} viewBox="0 0 900 120" preserveAspectRatio="none">
              <Path d={backWavePath} fill="#38BDF8" fillOpacity={0.6} />
            </Svg>
          </Animated.View>
          
          <View style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, backgroundColor: '#0284C7' }} />

          <Animated.View style={{ position: 'absolute', top: -50, width: 900, height: 120, left: 0, transform: [{ translateX: waveTranslateX1 }, { translateY: bobTranslateY1 }] }}>
            <Svg width={900} height={120} viewBox="0 0 900 120" preserveAspectRatio="none">
              <Path d={standardWavePath} fill="#0284C7" fillOpacity={1} />
            </Svg>
          </Animated.View>
        </Animated.View>
        
        <AnimatedNumber value={current} />
        <Text className="font-bold text-xs uppercase tracking-widest mt-1 z-10 text-white" style={{ textShadowColor: 'rgba(3, 105, 161, 0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
          / {target.toLocaleString()} ML
        </Text>
      </View>
    </View>
  );
});

CircularProgress.displayName = 'CircularProgress';

export default CircularProgress;
