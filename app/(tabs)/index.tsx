import { View, StyleSheet } from 'react-native';
import MatchaMap from '../../src/components/MatchaMap';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MatchaMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
