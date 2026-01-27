import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import { TextInput, TouchableOpacity } from "react-native";
import { Text, View } from "react-native";
import tw from "twrnc";
  const InputField = ({ label, user, icon: Icon, field, error, passwordVisible, setPasswordVisible, handleInputChange, ...props }) => (
    <View style={tw`mb-4`}>
      <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>{label}</Text>
      <View style={tw`flex-row items-center bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-100'} rounded-2xl px-4 h-14`}>
        <Icon size={20} color={error ? "#EF4444" : "#9CA3AF"} />
        <TextInput
          style={tw`flex-1 ml-3 text-gray-800`}
          value={user[field]}
          onChangeText={(val) => handleInputChange(field, val)}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
        {field === "password" && (
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            {passwordVisible ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={tw`flex-row items-center mt-1 ml-1`}>
          <AlertCircle size={14} color="#EF4444" />
          <Text style={tw`text-red-500 text-xs ml-1`}>{error}</Text>
        </View>
      )}
    </View>
  );
  export default InputField;