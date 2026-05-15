import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from "./contextAPI/AuthProvider";
import { SocketProvider } from "./contextAPI/SocketProvider";
import AppNavigation from "./navigation/appNavigation";
function MainContent() {
  const { loading } = useAuth();

  if (loading) {
     return null; // Or a splash screen
  }

  return (
    <SocketProvider>
      <AppNavigation />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
