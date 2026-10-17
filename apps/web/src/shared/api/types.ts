// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  // SP-106B validation 400s preserve the stock constraint message array;
  // other failures keep a single string.
  message: string | string[];
  statusCode: number;
  errors?: Record<string, string[]>;
}
