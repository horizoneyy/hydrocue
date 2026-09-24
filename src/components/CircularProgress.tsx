import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, Animated, Easing, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, ClipPath, G, Circle, LinearGradient, Stop, Ellipse } from 'react-native-svg';

const GComponent = React.forwardRef((props: any, ref) => {
  const { collapsable, ...rest } = props;
  return <G ref={ref} {...rest} />;
});
GComponent.displayName = 'GComponent';
const AnimatedG = Animated.createAnimatedComponent(GComponent);

const CircleComponent = React.forwardRef((props: any, ref) => {
  const { collapsable, ...rest } = props;
  return <Circle ref={ref} {...rest} />;
});
CircleComponent.displayName = 'CircleComponent';
const AnimatedCircle = Animated.createAnimatedComponent(CircleComponent);

export const AnimatedNumber = memo(({ value, className, style }: { value: number, className?: string, style?: any }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const prevValue = useRef(value);
  const listenerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;

    anim.setValue(from);
    Animated.timing(anim, {
      toValue: value,
      duration: 1500, // Match the liquid animation duration
      useNativeDriver: false,
    }).start();

    if (listenerIdRef.current) {
      anim.removeListener(listenerIdRef.current);
    }
    
    let lastUpdate = Date.now();
    listenerIdRef.current = anim.addListener(({ value: v }) => {
      const now = Date.now();
      const nextValue = Math.round(v);
      if (now - lastUpdate >= 32 || nextValue === value) {
        setDisplayValue(nextValue);
        lastUpdate = now;
      }
    });

    return () => {
      if (listenerIdRef.current) {
        anim.removeListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, [value, anim]);

  return (
    <Text className={className} style={style}>
      {displayValue.toLocaleString()}
    </Text>
  );
});
AnimatedNumber.displayName = 'AnimatedNumber';

const CircularProgress = memo(({ progress, target, current, isLogo }: { progress: number; target: number; current: number; isLogo?: boolean }) => {
  const { width } = useWindowDimensions();
  const size = isLogo ? 200 : width * 0.65;

  const fillAnim = useRef(new Animated.Value(0)).current;
  const vesselAnim = useRef(new Animated.Value(0)).current;
  const waveAnimFront = useRef(new Animated.Value(0)).current;
  const waveAnimBack = useRef(new Animated.Value(0)).current;
  
  const bubbleAnim1 = useRef(new Animated.Value(0)).current;
  const bubbleAnim2 = useRef(new Animated.Value(0)).current;
  const bubbleAnim3 = useRef(new Animated.Value(0)).current;
  const bubbleAnim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth Progress Timing
    Animated.timing(fillAnim, {
      toValue: Math.min(Math.max(progress, 0), 1.1),
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const animations = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(vesselAnim, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(vesselAnim, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(Animated.timing(waveAnimFront, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(waveAnimBack, { toValue: 1, duration: 4800, easing: Easing.linear, useNativeDriver: true })),
      
      Animated.loop(Animated.timing(bubbleAnim1, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })),
      Animated.sequence([
        Animated.delay(1000),
        Animated.loop(Animated.timing(bubbleAnim2, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }))
      ]),
      Animated.sequence([
        Animated.delay(1700),
        Animated.loop(Animated.timing(bubbleAnim3, { toValue: 1, duration: 2300, easing: Easing.linear, useNativeDriver: true }))
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.loop(Animated.timing(bubbleAnim4, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }))
      ])
    ];

    animations.forEach(anim => anim.start());
    return () => animations.forEach(anim => anim.stop());
  }, [progress, fillAnim, vesselAnim, waveAnimFront, waveAnimBack, bubbleAnim1, bubbleAnim2, bubbleAnim3, bubbleAnim4]);

  // Interpolations
  const translateY = fillAnim.interpolate({ inputRange: [0, 1, 1.1], outputRange: [80, -90, -95] });
  const vesselY = vesselAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const waveXFront = waveAnimFront.interpolate({ inputRange: [0, 1], outputRange: [0, -120] });
  const waveXBack = waveAnimBack.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });

  // Bubble interpolations
  const createBubble = (anim: Animated.Value, xOffset: number, yOffset: number, scaleStart: number, scaleEnd: number) => ({
    x: anim.interpolate({ inputRange: [0, 1], outputRange: [0, xOffset] }),
    y: anim.interpolate({ inputRange: [0, 1], outputRange: [0, yOffset] }),
    scale: anim.interpolate({ inputRange: [0, 1], outputRange: [scaleStart, scaleEnd] }),
    opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.85, 0] })
  });

  const b1 = createBubble(bubbleAnim1, -4, -60, 0.6, 1.1);
  const b2 = createBubble(bubbleAnim2, 5, -50, 0.5, 1.15);
  const b3 = createBubble(bubbleAnim3, -3, -40, 0.7, 1);
  const b4 = createBubble(bubbleAnim4, 5, -50, 0.5, 1.15); // Reuses b2's animation curve

  const backWave = "M-120 102 Q -90 92 -60 102 T 0 102 T 60 102 T 120 102 T 180 102 T 240 102 T 300 102 T 360 102 L 360 300 L -120 300 Z";
  const frontWave = "M-120 108 Q -90 120 -60 108 T 0 108 T 60 108 T 120 108 T 180 108 T 240 108 T 300 108 T 360 108 L 360 300 L -120 300 Z";
  const frontWaveGlint = "M-120 108 Q -90 120 -60 108 T 0 108 T 60 108 T 120 108 T 180 108 T 240 108 T 300 108 T 360 108";
  
  return (
    <View className="items-center justify-center relative self-center" style={{ width: size, height: size, marginVertical: isLogo ? 0 : 24 }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="waterGradDeep" x1="0%" x2="0%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#0284C7" />
            <Stop offset="100%" stopColor="#0369A1" />
          </LinearGradient>
          <LinearGradient id="waterSurfaceGlint" x1="0%" x2="100%" y1="0%" y2="0%">
            <Stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.95" />
            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.5" />
          </LinearGradient>
          <LinearGradient id="glassSpecular" x1="0%" x2="100%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </LinearGradient>
          <ClipPath id="innerDropletMask">
            <Path d="M100 22 C100 22 45 80 45 120 C45 152 70 178 100 178 C130 178 155 152 155 120 C155 80 100 22 100 22 Z" />
          </ClipPath>
        </Defs>

        <AnimatedG style={{ transform: [{ translateY: vesselY }] } as any}>
          {/* Drop Shadow */}
          <Ellipse cx="100" cy="186" fill="#0284C7" opacity="0.16" rx="30" ry="5.5" />
          
          {/* Droplet Base Shell */}
          <Path d="M100 22 C100 22 45 80 45 120 C45 152 70 178 100 178 C130 178 155 152 155 120 C155 80 100 22 100 22 Z" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="2.5" />
          
          {/* Masked Internal Liquid */}
          <G clipPath="url(#innerDropletMask)">
            <AnimatedG style={{ transform: [{ translateY: translateY }] } as any}>
              {/* Back Wave */}
              <AnimatedG opacity="0.45" style={{ transform: [{ translateX: waveXBack }] } as any}>
                <Path d={backWave} fill="#0284C7" />
              </AnimatedG>
              
              {/* Front Wave */}
              <AnimatedG style={{ transform: [{ translateX: waveXFront }] } as any}>
                <Path d={frontWave} fill="url(#waterGradDeep)" />
              </AnimatedG>
              
              {/* Glint Line */}
              <AnimatedG style={{ transform: [{ translateX: waveXFront }] } as any}>
                <Path d={frontWaveGlint} fill="none" opacity="0.85" stroke="url(#waterSurfaceGlint)" strokeWidth="2.5" />
              </AnimatedG>
              
              {/* Animated Bubbles */}
              <AnimatedCircle cx="86" cy="162" r="4" fill="#FFFFFF" style={{ transform: [{ translateX: b1.x }, { translateY: b1.y }, { scale: b1.scale }], opacity: b1.opacity, transformOrigin: '86px 162px' } as any} />
              <AnimatedCircle cx="115" cy="158" r="3.2" fill="#E0F2FE" style={{ transform: [{ translateX: b2.x }, { translateY: b2.y }, { scale: b2.scale }], opacity: b2.opacity, transformOrigin: '115px 158px' } as any} />
              <AnimatedCircle cx="100" cy="168" r="3.8" fill="#FFFFFF" style={{ transform: [{ translateX: b3.x }, { translateY: b3.y }, { scale: b3.scale }], opacity: b3.opacity, transformOrigin: '100px 168px' } as any} />
              <AnimatedCircle cx="122" cy="145" r="2.2" fill="#FFFFFF" style={{ transform: [{ translateX: b4.x }, { translateY: b4.y }, { scale: b4.scale }], opacity: b4.opacity, transformOrigin: '122px 145px' } as any} />
              
              {/* Static Bubbles */}
              <Circle cx="92" cy="138" fill="#E0F2FE" opacity="0.7" r="2" />
              <Circle cx="108" cy="128" fill="#FFFFFF" opacity="0.8" r="2.5" />
            </AnimatedG>
          </G>
          
          {/* Droplet Reflection Speculars */}
          <Path d="M100 28 C90 42 66 78 63 108 C62 118 64 132 70 142 C67 132 66 120 70 106 C76 82 94 48 98 38 Z" fill="url(#glassSpecular)" />
          {/* Apex Glint Highlight */}
          <Ellipse cx="100" cy="38" fill="#FFFFFF" opacity="0.8" rx="2.5" ry="5.5" transform="rotate(-15 100 38)" />
          <Circle cx="128" cy="80" fill="#FFFFFF" opacity="0.55" r="3" />
        </AnimatedG>
      </Svg>
    </View>
  );
});

CircularProgress.displayName = 'CircularProgress';

export default CircularProgress;
