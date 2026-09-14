import toast from 'react-hot-toast';

interface ApiErrorResponse {
  error: string;
  message?: string;
}

export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    const errorMessage = error.response.data.error;
    toast.error(errorMessage);
    return errorMessage;
  }
  if (error.message) {
    toast.error(error.message);
    return error.message;
  }
  const defaultMessage = 'An unexpected error occurred';
  toast.error(defaultMessage);
  return defaultMessage;
};

export const handleApiSuccess = (message: string) => {
  toast.success(message);
};
