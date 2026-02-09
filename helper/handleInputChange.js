// Hàm này "nhận trước" các state, sau đó trả về một hàm mới chờ nhận field/value
// Hỗ trợ cập nhật cả các trường lồng nhau (e.g. "bankInfo.bankName")
export const createInputChangeHandler = (setUser, setErrors) => {
  return (field, value) => {
    // Xử lý cập nhật state
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setUser(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setUser(prev => ({ ...prev, [field]: value }));
    }

    // Xử lý xóa lỗi
    if (setErrors) {
      setErrors(prev => {
        if (!prev[field]) return prev;
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
};