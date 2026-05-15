import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import LawerLoginScreen from "../screens/LawerLogin";
import SignUpScreen from "../screens/SignUpScreen";
import VerifyOTPScreen from "../screens/verifyOTPScreen";
import LawyerSignUp from "../screens/LawyerSignUp";
import ManageAvailability from "../screens/ManageAvailability";
import LawyerDiscovery from "../screens/LawyerDiscovery";
import BookingScreen from "../screens/BookingScreen";
import PaymentScreen from "../screens/PaymentScreen";
import QRCodeScreen from "../screens/QRCodeScreen";
import CardPaymentScreen from "../screens/CardPaymentScreen";
import AppointmentDetailScreen from "../screens/AppointmentDetailScreen";
import LawyerAppointmentsScreen from "../screens/LawyerAppointmentsScreen";
import LawyerAppointmentDetailScreen from "../screens/LawyerAppointmentDetailScreen";
import LegalArticlesScreen from "../screens/LegalArticlesScreen";
import CreateArticleScreen from "../screens/CreateArticleScreen";
import ArticleDetailScreen from "../screens/ArticleDetailScreen";
import LegalResourcesScreen from "../screens/LegalResourcesScreen";
import LegalResourceDetailScreen from "../screens/LegalResourceDetailScreen";
import LegalLibraryScreen from "../screens/LegalLibraryScreen";
import LegalFormDetailScreen from "../screens/LegalFormDetailScreen";
import CreateLegalFormScreen from "../screens/CreateLegalFormScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatDetailScreen from "../screens/ChatDetailScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import MemberSignUpScreen from "../screens/MemberSignUpScreen";
import LawyerUpgradeScreen from "../screens/LawyerUpgradeScreen";
import LawyerProfileScreen from "../screens/LawyerProfileScreen";
import LegalDocumentComposerScreen from "../screens/LegalDocumentComposerScreen";
import ReferralsScreen from "../screens/ReferralsScreen";
import CallScreen from "../screens/CallScreen";
import { useSocket } from "../contextAPI/SocketProvider";
import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import AboutAppScreen from "../screens/AboutAppScreen";
import ChatWithAIScreen from "../screens/ChatWithAIScreen";

const stack = createNativeStackNavigator();

const CallObserver = () => {
    const { callStatus } = useSocket();
    const navigation = useNavigation();

    useEffect(() => {
        // Kiểm tra xem navigator đã sẵn sàng chưa trước khi chuyển màn hình
        if (navigation && (callStatus === 'receiving' || callStatus === 'calling' || callStatus === 'connected')) {
            try {
                // Kiểm tra xem chúng ta đã ở màn hình CallScreen chưa để tránh navigate lặp lại
                const routes = navigation.getState()?.routes;
                const currentRoute = routes ? routes[routes.length - 1]?.name : null;
                
                if (currentRoute !== 'CallScreen') {
                    navigation.navigate('CallScreen');
                }
            } catch (e) {
                console.warn("Navigation logic failed, likely navigator not ready:", e);
                // Thử lại sau 500ms nếu lỗi
                const timer = setTimeout(() => {
                    if (callStatus !== 'idle') navigation.navigate('CallScreen');
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [callStatus, navigation]);

    return null;
};

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <CallObserver />
        <stack.Navigator>
          <stack.Screen
            name="Home"
            options={{ headerShown: false }}
            component={HomeScreen}
          />
          <stack.Screen
            name="AboutApp"
            options={{ headerShown: false }}
            component={AboutAppScreen}
          />
          <stack.Screen
            name="Login"
            options={{ headerShown: false }}
            component={LoginScreen}
          />
          <stack.Screen
            name="LawyerLogin"
            options={{ headerShown: false }}
            component={LawerLoginScreen}
          />
          <stack.Screen
            name="SignUp"
            options={{ headerShown: false }}
            component={SignUpScreen}
          />
          <stack.Screen
            name="verify-email"
            options={{ headerShown: false }}
            component={VerifyOTPScreen}
          />
          <stack.Screen
            name="lawyer-signup"
            options={{ headerShown: false }}
            component={LawyerSignUp}
          />
          <stack.Screen
            name="ManageAvailability"
            options={{ headerShown: false }}
            component={ManageAvailability}
          />
          <stack.Screen
            name="LawyerDiscovery"
            options={{ headerShown: false }}
            component={LawyerDiscovery}
          />
          <stack.Screen
            name="BookingScreen"
            options={{ headerShown: false }}
            component={BookingScreen}
          />
          <stack.Screen
            name="Payment"
            options={{ headerShown: false }}
            component={PaymentScreen}
          />
          <stack.Screen
            name="QRCodeScreen"
            options={{ headerShown: false }}
            component={QRCodeScreen}
          />
          <stack.Screen
            name="CardPaymentScreen"
            options={{ headerShown: false }}
            component={CardPaymentScreen}
          />
          <stack.Screen
            name="Appointments"
            options={{ headerShown: false }}
            component={AppointmentsScreen}
          />
          <stack.Screen
            name="AppointmentDetail"
            options={{ headerShown: false }}
            component={AppointmentDetailScreen}
          />
          <stack.Screen
            name="LawyerAppointments"
            options={{ headerShown: false }}
            component={LawyerAppointmentsScreen}
          />
          <stack.Screen
            name="LawyerAppointmentDetail"
            options={{ headerShown: false }}
            component={LawyerAppointmentDetailScreen}
          />
          <stack.Screen
            name="LegalArticles"
            options={{ headerShown: false }}
            component={LegalArticlesScreen}
          />
          <stack.Screen
            name="CreateArticle"
            options={{ headerShown: false }}
            component={CreateArticleScreen}
          />
          <stack.Screen
            name="ArticleDetail"
            options={{ headerShown: false }}
            component={ArticleDetailScreen}
          />
          <stack.Screen
            name="LegalResources"
            options={{ headerShown: false }}
            component={LegalResourcesScreen}
          />
          <stack.Screen
            name="LegalResourceDetail"
            options={{ headerShown: false }}
            component={LegalResourceDetailScreen}
          />
          <stack.Screen
            name="LegalLibrary"
            options={{ headerShown: false }}
            component={LegalLibraryScreen}
          />
          <stack.Screen
            name="LegalFormDetail"
            options={{ headerShown: false }}
            component={LegalFormDetailScreen}
          />
          <stack.Screen
            name="CreateLegalForm"
            options={{ headerShown: false }}
            component={CreateLegalFormScreen}
          />
          <stack.Screen
            name="ChatList"
            options={{ headerShown: false }}
            component={ChatListScreen}
          />
          <stack.Screen
            name="ChatDetail"
            options={{ headerShown: false }}
            component={ChatDetailScreen}
          />
          <stack.Screen
            name="ChatWithAI"
            options={{ headerShown: false }}
            component={ChatWithAIScreen}
          />
          <stack.Screen
            name="UserProfile"
            options={{ headerShown: false }}
            component={UserProfileScreen}
          />
          <stack.Screen
            name="ChangePassword"
            options={{ headerShown: false }}
            component={ChangePasswordScreen}
          />
          <stack.Screen
            name="ResetPassword"
            options={{ headerShown: false }}
            component={ResetPasswordScreen}
          />
          <stack.Screen
            name="ForgotPassword"
            options={{ headerShown: false }}
            component={ForgotPasswordScreen}
          />
          <stack.Screen
            name="MemberSignUp"
            options={{ headerShown: false }}
            component={MemberSignUpScreen}
          />
          <stack.Screen
            name="LawyerUpgrade"
            options={{ headerShown: false }}
            component={LawyerUpgradeScreen}
          />
          <stack.Screen
            name="LawyerProfile"
            options={{ headerShown: false }}
            component={LawyerProfileScreen}
          />
          <stack.Screen
            name="LegalDocumentComposer"
            options={{ headerShown: false }}
            component={LegalDocumentComposerScreen}
          />
          <stack.Screen
            name="Referrals"
            options={{ headerShown: false }}
            component={ReferralsScreen}
          />
          <stack.Screen
            name="CallScreen"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
            component={CallScreen}
          />
        </stack.Navigator>
      </SafeAreaProvider>
    </NavigationContainer>
  );
}
