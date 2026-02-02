export interface RegisterData {
  // Data til brugerregistrering
  name: string;
  email: string;
  password: string;
}

export interface User {
  // Brugeroplysninger
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  // Respons fra autentificering
  user: User;
  token?: string;
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
