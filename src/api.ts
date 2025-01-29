/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import axios, {
  AxiosRequestConfig,
  Method,
  AxiosResponse,
  AxiosInstance,
} from 'axios';
import { DocData, DocServices } from './types.js';
import { AuthHeaders } from './functions/openai/helpers.js';

const GOOGLE_API_ENDPOINT = process.env.GOOGLE_API_ENDPOINT || '';
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || '';
const SECRET_HEADER_NAME = process.env.SECRET_HEADER_NAME || '';
const SECRET_HEADER_VALUE = process.env.SECRET_HEADER_VALUE || '';

const REQUEST_TIMEOUT_GRAPHQL_DEFAULT = 30000;

// https://github.com/axios/axios/issues/4193#issuecomment-1158137489
interface MyAxiosRequestConfig extends Omit<AxiosRequestConfig, 'headers'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: any; // this was "any" at v0.21.1 but now broken between 0.21.4 >= 0.27.2
}

interface GQLQuery {
  query: string; // the query string passed to graphql, which should be a static query
  variables?: Record<string, unknown>; // variables (if any) for the static query
}

/**
 * Middleware function takes some action on an axios instance
 */
export interface AxiosMiddleware {
  (axiosInstance: AxiosInstance): void;
}

interface HttpRequestConfig {
  accessToken?: string; // bearer-token http auth
  axiosConfig?: MyAxiosRequestConfig; // any axios config for the request
  axiosMiddleware?: AxiosMiddleware; // used (for example) to extract accessToken from response headers
  /**
   * When set, will use this prop (or array of props) to extract return data from a json response, e.g.
   *
   * dataPath: ["foo", "bar"]
   *
   * // will extract "barvalue" for the return
   * { "foo": { "bar": "barvalue" } }
   */
  dataPath?: string | string[];
}

async function execHttp<T>(
  method: Method,
  query: string,
  opts?: HttpRequestConfig
): Promise<T> {
  const optsEffective: HttpRequestConfig = opts || {};
  const axiosConfig = opts?.axiosConfig || {};
  const axiosInst = axios.create();
  if (optsEffective.axiosMiddleware) {
    optsEffective.axiosMiddleware(axiosInst);
  }
  const result = await axiosInst
    .request({
      url: query,
      method: method,
      ...axiosConfig,
      headers: {
        ...(axiosConfig.headers || {}), // if any headers passed in opts, include them
        ...(optsEffective && optsEffective.accessToken // if accessToken passed in opts, add auth to headers
          ? { Authorization: `bearer ${optsEffective.accessToken}` }
          : {}),
      },
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
  return getDataFromAxiosResponse(result, optsEffective.dataPath || []);
}

export function throwErrorsInAxiosResponse(res: AxiosResponse): void {
  if (!(res.status >= 200 && res.status <= 299)) {
    throw new Error(`http request failed: ${res.data}`);
  }
  if (res.data.errors) {
    throw new Error(`errors in response: ${JSON.stringify(res.data.errors)}`);
  }
}

function getDataFromAxiosResponse(res: AxiosResponse, path: string | string[]) {
  throwErrorsInAxiosResponse(res);
  let data = res.data.data;
  if (!data) {
    throw new Error(`no data in reponse: ${JSON.stringify(res.data)}`);
  }
  const dataPath = Array.isArray(path)
    ? path
    : typeof path === 'string'
      ? [path]
      : [];
  dataPath.forEach((pathPart) => {
    if (!data) {
      throw new Error(
        `unexpected response data shape for dataPath ${JSON.stringify(
          dataPath
        )} and request ${res.request} : ${res.data}`
      );
    }
    data = data[pathPart];
  });
  return data;
}

export async function getDocData(
  docId: string,
  authHeaders: AuthHeaders,
  docService: DocServices
): Promise<DocData> {
  const headers = {
    [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
    ...authHeaders,
  };
  const res = await axios.get<DocData>(
    `${GOOGLE_API_ENDPOINT}/get_doc_data/${docId}/${docService}`,
    {
      headers: headers,
    }
  );
  return res.data;
}

export async function execGql<T>(
  query: GQLQuery,
  opts?: HttpRequestConfig
): Promise<T> {
  return execHttp<T>('POST', GRAPHQL_ENDPOINT, {
    // axiosMiddleware: applyAppTokenRefreshInterceptor,
    ...(opts || {}),
    axiosConfig: {
      timeout: REQUEST_TIMEOUT_GRAPHQL_DEFAULT, // default timeout can be overriden by passed-in config
      ...(opts?.axiosConfig || {}),
      data: query,
    },
  });
}
