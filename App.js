import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "./contextAPI/AuthProvider";
import AppNavigation from "./navigation/appNavigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
