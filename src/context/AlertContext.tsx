import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Match the app's color palette
const colors = {
  primary: '#FFD166',      // Sunglow
  primaryDark: '#F4B350',  // Deep Sunglow
  bg: '#F4F1E6',           // Sand background
  card: '#FFFEF9',         // Creamy White
  text: '#451a03',         // Dark Brown
  textSecondary: '#78350f',// Amber 900
  border: '#E8E4D6',
  error: '#ef4444',
};

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
  // State for rendering
  visible: boolean;
  options: AlertOptions | null;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setAlertOptions] = useState<AlertOptions | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  const showAlert = useCallback((newOptions: AlertOptions) => {
    setAlertOptions(newOptions);
    setVisible(true);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setAlertOptions(null);
    });
  }, [fadeAnim, scaleAnim]);

  return (
    <AlertContext.Provider value={{ 
      showAlert, 
      hideAlert,
      visible,
      options,
      fadeAnim,
      scaleAnim
    }}>
      {children}
    </AlertContext.Provider>
  );
}

// Extract UI into a separate component for reuse
export function AlertContent({ 
  options, 
  fadeAnim, 
  scaleAnim, 
  hideAlert 
}: { 
  options: AlertOptions | null, 
  fadeAnim: Animated.Value, 
  scaleAnim: Animated.Value, 
  hideAlert: () => void 
}) {
  const handleButtonPress = (onPress?: () => void) => {
    hideAlert();
    if (onPress) {
      setTimeout(onPress, 200);
    }
  };

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: fadeAnim }
        ]} 
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={hideAlert} />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.alertContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{options?.title}</Text>
          {options?.message && (
            <Text style={styles.message}>{options.message}</Text>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          {(!options?.buttons || options.buttons.length === 0) ? (
            <Pressable 
              style={styles.button} 
              onPress={() => handleButtonPress()}
            >
              <Text style={styles.buttonText}>OK</Text>
            </Pressable>
          ) : (
            options.buttons.map((btn, index) => (
              <Pressable
                key={index}
                style={[
                  styles.button,
                  index > 0 && styles.buttonBorder,
                  btn.style === 'destructive' && styles.destructiveButton
                ]}
                onPress={() => handleButtonPress(btn.onPress)}
              >
                <Text style={[
                  styles.buttonText,
                  btn.style === 'cancel' && styles.cancelButtonText,
                  btn.style === 'destructive' && styles.destructiveButtonText
                ]}>
                  {btn.text}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export function AlertContainer() {
  const { visible, options, hideAlert, fadeAnim, scaleAnim } = useAlert();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={hideAlert}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
    >
      <AlertContent 
        options={options} 
        fadeAnim={fadeAnim} 
        scaleAnim={scaleAnim} 
        hideAlert={hideAlert} 
      />
    </Modal>
  );
}

// New component: AlertOverlay (for rendering inside another Modal)
export function AlertOverlay() {
  const { visible, options, hideAlert, fadeAnim, scaleAnim } = useAlert();

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 99999 }]}>
      <AlertContent 
        options={options} 
        fadeAnim={fadeAnim} 
        scaleAnim={scaleAnim} 
        hideAlert={hideAlert} 
      />
    </View>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  alertContainer: {
    width: Math.min(SCREEN_WIDTH * 0.85, 320),
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 83, 9, 0.1)',
  },
  button: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(180, 83, 9, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cancelButtonText: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  destructiveButton: {
    // Optional: background for destructive
  },
  destructiveButtonText: {
    color: colors.error,
  },
});
