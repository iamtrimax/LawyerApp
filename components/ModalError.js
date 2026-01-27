import { AlertCircle } from "lucide-react-native";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
const ModalError = ({ showErrorModal, setShowErrorModal, serverError, typeError }) => {
  return (
    <Modal visible={showErrorModal} transparent animationType="fade">
      <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
        <View
          style={tw`bg-white p-6 rounded-3xl w-full items-center shadow-xl`}
        >
          <View
            style={tw`w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4`}
          >
            <AlertCircle size={40} color="#EF4444" />
          </View>
          <Text style={tw`text-xl font-bold text-gray-800 mb-2`}>
            {typeError}
          </Text>
          <Text style={tw`text-gray-500 text-center mb-6`}>{serverError}</Text>
          <TouchableOpacity
            onPress={() => setShowErrorModal(false)}
            style={tw`bg-red-500 w-full py-3 rounded-xl`}
          >
            <Text style={tw`text-white text-center font-bold`}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
export default ModalError;