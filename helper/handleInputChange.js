// Hàm này "nhận trước" các state, sau đó trả về một hàm mới chờ nhận field/value
export const createInputChangeHandler = (user, setUser, errors, setErrors) => {
  return (field, value) => {
    setUser({ ...user, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };
};