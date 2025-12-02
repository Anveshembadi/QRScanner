import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found" }} />
      <View style={styles.container}>
        <AlertCircle color="#94a3b8" size={64} />
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Track Kit</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#1e293b",
    marginTop: 20,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#2563eb",
    borderRadius: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
