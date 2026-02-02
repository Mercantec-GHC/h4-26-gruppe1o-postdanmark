import { API_BASE_URL } from "@/constants/config";
import { RegisterData, AuthResponse, ErrorResponse } from "@/types/auth";

// Custom fejlklasse til API-fejl
export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Funktion til at registrere en ny bruger
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const url = `${API_BASE_URL}api/Auth/register`;
  console.log(`[AUTH] POST ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = "Registrering mislykkedes. Prøv igen.";

      try {
        const errorData: ErrorResponse = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.title) {
          errorMessage = errorData.title;
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(response.status, errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(0, "Netværksfejl: " + error.message);
    }

    throw new ApiError(0, "Ukendt fejl opstod");
  }
}
