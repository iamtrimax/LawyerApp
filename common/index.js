const url_api = process.env.EXPO_PUBLIC_API_URL;
const socket_url = url_api; // Use the same host for WebSocket

const summaryAPI = {
  verifyEmail: {
    url: `${url_api}/api/verify-email`,
    method: "POST",
  },
  registerUser: {
    url: `${url_api}/api/register`,
    method: "POST",
  },
  registerLawyer: {
    url: `${url_api}/api/lawyer/register`,
    method: "POST",
  },
  login: {
    url: `${url_api}/api/login`,
    method: "POST",
  },
  updateToken: {
    url: `${url_api}/api/update-token`,
    method: "POST",
  },
  lawyerDetail: {
    url: `${url_api}/api/lawyer/detail`,
    method: "GET",
  },
  updateSchedule: {
    url: `${url_api}/api/lawyer/update-schedule`,
    method: "POST",
  },
  getSchedule: {
    url: `${url_api}/api/lawyer/schedule`,
    method: "GET",
  },
  filterLawyers: {
    url: `${url_api}/api/search-lawyer`,
    method: "GET",
  },
  getScheduleByLawyerId: {
    url: `${url_api}/api/schedule/:lawyerId`,
    method: "GET",
  },
  createBookingLawyer: {
    url: `${url_api}/api/booking/create`,
    method: "POST",
  },
  createUrlPayment: {
    url: `${url_api}/api/payment/create-url`,
    method: "POST",
  },
  getBookings: {
    url: `${url_api}/api/booking/list`,
    method: "GET",
  },
  getLawyerBookings: {
    url: `${url_api}/api/lawyer/bookings`,
    method: "GET",
  },
  getLawyerBookingsDetail: {
    url: `${url_api}/api/lawyer/booking-detail/:booking-id`,
    method: "GET",
  },
  getArticles: {
    url: `${url_api}/api/articles`,
    method: "GET",
  },
  getArticleDetail: {
    url: `${url_api}/api/articles/:id`,
    method: "GET",
  },
  createArticle: {
    url: `${url_api}/api/articles/create`,
    method: "POST",
  },
  updateArticle: {
    url: `${url_api}/api/articles/update/:id`,
    method: "PUT",
  },
  deleteArticle: {
    url: `${url_api}/api/articles/delete/:id`,
    method: "DELETE",
  },
  confirmPayment: {
    url: `${url_api}/api/lawyer/booking/confirm-payment/:bookingId`,
    method: "PUT",
  },
  getLegalResources: {
    url: `${url_api}/api/legal-resources`,
    method: "GET",
  },
  getLegalResourceDetail: {
    url: `${url_api}/api/legal-resources/:id`,
    method: "GET",
  },
  getLegalForms: {
    url: `${url_api}/api/legal-forms`,
    method: "GET",
  },
  getLegalFormDetail: {
    url: `${url_api}/api/legal-forms/:id`,
    method: "GET",
  },
  createLegalForm: {
    url: `${url_api}/api/lawyer/forms/create`,
    method: "POST",
  },
  updateLegalForm: {
    url: `${url_api}/api/lawyer/forms/update/:id`,
    method: "PUT",
  },
  deleteLegalForm: {
    url: `${url_api}/api/lawyer/forms/delete/:id`,
    method: "DELETE",
  },
  getConversations: {
    url: `${url_api}/api/chat/conversations`,
    method: "GET",
  },
  getMessages: {
    url: `${url_api}/api/chat/history/:conversationID`,
    method: "GET",
  },
  startConversation: {
    url: `${url_api}/api/chat/start`,
    method: "POST",
  },
  sendMessage: {
    url: `${url_api}/api/chat/send`,
    method: "POST",
  },
  updateUser: {
    url: `${url_api}/api/update-user`,
    method: "PUT",
  },
  changePassword: {
    url: `${url_api}/api/change-password`,
    method: "POST",
  },
  checkEmailForgotPassword: {
    url: `${url_api}/api/forgot-password/check-email`,
    method: "POST",
  },
  verifyOTPForgotPassword: {
    url: `${url_api}/api/forgot-password/verify-otp`,
    method: "POST",
  },
  resetPassword: {
    url: `${url_api}/api/forgot-password/reset`,
    method: "POST",
  },
  cancelBooking: {
    url: `${url_api}/api/booking/cancel/:bookingId`,
    method: "POST",
  },
  AISearch: {
    url: `${url_api}/api/articles/ai-search`,
    method: "GET",
  },
};

export { socket_url };
export default summaryAPI;
