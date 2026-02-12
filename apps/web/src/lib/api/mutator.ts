export type ErrorType<Error> = Error;
export type BodyType<BodyData> = BodyData;

type ApiClientOptions = RequestInit & {
  params?: Record<string, unknown>;
};

type ApiErrorPayload = {
  status: number;
  data: unknown;
};

type UnauthorizedPayload = {
  loginUrl?: string;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, payload: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = payload.status;
    this.data = payload.data;
  }
}

const BFF_BASE_PATH = "/api/bff";

const withSearchParams = (url: string, params?: Record<string, unknown>) => {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.append(key, String(value));
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${queryString}`;
};

const parseResponseData = async (response: Response) => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const textBody = await response.text();
  if (!textBody) {
    return undefined;
  }

  try {
    return JSON.parse(textBody);
  } catch {
    return textBody;
  }
};

const createBffPath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BFF_BASE_PATH}${normalizedPath}`;
};

export const apiClient = async <T>(
  url: string,
  options: ApiClientOptions = {},
): Promise<T> => {
  const { params, ...requestOptions } = options;
  const requestUrl = withSearchParams(createBffPath(url), params);
  const response = await fetch(requestUrl, requestOptions);
  const responseData = await parseResponseData(response);

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      typeof responseData === "object" &&
      responseData !== null &&
      "loginUrl" in responseData &&
      typeof (responseData as UnauthorizedPayload).loginUrl === "string"
    ) {
      const loginUrl = (responseData as UnauthorizedPayload).loginUrl;
      if (loginUrl) {
        window.location.assign(loginUrl);
      }
    }

    const message =
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
        ? responseData.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, {
      status: response.status,
      data: responseData,
    });
  }

  return {
    data: responseData,
    status: response.status,
    headers: response.headers,
  } as T;
};
