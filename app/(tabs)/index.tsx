import { ScrollView, StyleSheet } from "react-native"

import ConnectionDevice from "@/bluetooth/ConnectionDevice"
import { SafeAreaView } from "react-native-safe-area-context"

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ConnectionDevice />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    width: "100%",
    height: "100%",
  },
})
