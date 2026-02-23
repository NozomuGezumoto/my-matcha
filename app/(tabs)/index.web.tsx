import { View, StyleSheet } from 'react-native';
import MatchaMapWeb from '../../src/components/MatchaMapWeb';

export default function MapScreenWeb() {
  return (
    <View style={styles.container}>
      <MatchaMapWeb />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
