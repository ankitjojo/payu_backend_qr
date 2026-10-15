import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger.util';

/**
 * Common HTTP helper class for making external API requests.
 */
export class HttpHelper {
  /**
   * Generic POST request method
   */
  public static async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      logger.info(`Making POST request to ${url}`);
      const response: AxiosResponse<T> = await axios.post(url, data, config);
      
      const responseDataToLog = typeof response.data === 'string' 
        ? response.data.substring(0, 1000) + ((response.data as string).length > 1000 ? '...' : '')
        : JSON.stringify(response.data, null, 2);
        
      logger.info(`Response from ${url}:`, responseDataToLog);
      return response.data;
    } catch (error: any) {
      logger.error(`POST request failed for ${url}:`, error.message);
      if (error.response) {
        const errorDataToLog = typeof error.response.data === 'string'
          ? error.response.data.substring(0, 1000)
          : JSON.stringify(error.response.data, null, 2);
        logger.error(`Error Response from ${url}:`, errorDataToLog);
      }
      throw error;
    }
  }

  /**
   * Specific POST request tailored for PayU URL-encoded forms
   */
  public static async postForm<T>(url: string, data: Record<string, string>): Promise<T> {
    logger.info(`[postForm] Payload to ${url}:`, JSON.stringify(data, null, 2));

    const params = new URLSearchParams();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        params.append(key, String(data[key]));
      }
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    return this.post<T>(url, params, config);
  }
}
