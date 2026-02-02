export interface RegisterData {
  // Data til brugerregistrering
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  // Data til brugerlogin
  email: string;
  password: string;
}

export interface User {
  // Brugeroplysninger
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  // Respons fra autentificering
  message: string;
  token: string;
  user: User;
}

export interface ErrorResponse {
  // Fejlrespons fra API
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  additionalProp1?: string;
  additionalProp2?: string;
  additionalProp3?: string;
}
