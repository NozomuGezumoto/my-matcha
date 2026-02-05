import { View, StyleSheet } from 'react-native';
import SushiMap from '../../src/components/SushiMap';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <SushiMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
