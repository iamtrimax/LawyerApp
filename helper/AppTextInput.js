import React from 'react';
import { TextInput } from 'react-native';

/**
 * AppTextInput - Wrapper của TextInput đảm bảo màu chữ luôn hiển thị đúng
 * trên Android Dark Mode (tránh bị ghi đè thành màu trắng).
 */
const AppTextInput = ({ style, ...props }) => {
  return (
    <TextInput
      style={[{ color: '#1f2937' }, style]}
      placeholderTextColor={props.placeholderTextColor || '#9CA3AF'}
      {...props}
    />
  );
};

export default AppTextInput;
