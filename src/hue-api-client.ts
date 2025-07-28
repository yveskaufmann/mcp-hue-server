import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
/**
 * Custom error class for Hue API errors
 */
export class HueApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response: any,
  ) {
    super(message);
    this.name = 'HueApiError';
  }
}

/**
 * Base client for Hue API
 */
export class HueApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  protected axiosInstance: AxiosInstance;

  constructor(options: { bridgeIp: string; apiKey: string }) {
    this.baseUrl = `https://${options.bridgeIp}/clip/v2`;
    this.apiKey = options.apiKey;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'hue-application-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      // Skip SSL verification since Hue Bridge uses self-signed certificates
      httpsAgent: new Agent({ rejectUnauthorized: false }),
    });

    // Add response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new HueApiError(
            `Hue API Error: ${error.response.status} ${error.response.statusText}`,
            error.response.status,
            error.response.data,
          );
        } else if (error.request) {
          throw new Error('No response received from Hue Bridge');
        } else {
          throw new Error(`Error setting up request: ${error.message}`);
        }
      },
    );
  }

  // Method to override API key for specific requests
  protected getConfig(customApiKey?: string): AxiosRequestConfig {
    if (!customApiKey) return {};

    return {
      headers: {
        'hue-application-key': customApiKey,
      },
    };
  }

  // Resources client getter
  get light() {
    return new LightClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get room() {
    return new RoomClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get zone() {
    return new ZoneClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get scene() {
    return new SceneClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get device() {
    return new DeviceClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get bridge() {
    return new BridgeClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get entertainment() {
    return new EntertainmentClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get config() {
    return new ConfigClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get user() {
    return new UserClient(this.axiosInstance, this.getConfig.bind(this));
  }

  get groupedLight() {
    return new GroupedLightClient(this.axiosInstance, this.getConfig.bind(this));
  }
}

/**
 * Base resource client with common methods
 */
abstract class ResourceClient {
  protected readonly endpoint: string;

  constructor(
    protected readonly axios: AxiosInstance,
    protected readonly getConfig: (customApiKey?: string) => AxiosRequestConfig,
    endpoint: string,
  ) {
    this.endpoint = endpoint;
  }

  // Get all resources
  async getAll(customApiKey?: string): Promise<any[]> {
    const response = await this.axios.get(this.endpoint, this.getConfig(customApiKey));
    return response.data.data;
  }

  // Get resource by ID
  async getById(id: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(`${this.endpoint}/${id}`, this.getConfig(customApiKey));
    return response.data.data[0];
  }

  // Update resource
  async update(id: string, data: any, customApiKey?: string): Promise<any> {
    const response = await this.axios.put(`${this.endpoint}/${id}`, data, this.getConfig(customApiKey));
    return response.data;
  }

  // Delete resource
  async delete(id: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.delete(`${this.endpoint}/${id}`, this.getConfig(customApiKey));
    return response.data;
  }

  // Create resource
  async create(data: any, customApiKey?: string): Promise<any> {
    const response = await this.axios.post(this.endpoint, data, this.getConfig(customApiKey));
    return response.data;
  }
}

/**
 * Light resource client
 */
export class LightClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/light');
  }

  // Turn on light
  async turnOn(id: string, brightness?: number, customApiKey?: string): Promise<any> {
    const data: any = {
      on: { on: true },
    };

    if (brightness !== undefined) {
      data.dimming = { brightness };
    }

    return this.update(id, data, customApiKey);
  }

  // Turn off light
  async turnOff(id: string, customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        on: { on: false },
      },
      customApiKey,
    );
  }

  // Set light color
  async setColor(
    id: string,
    options: { xy?: [number, number]; hue?: number; saturation?: number },
    customApiKey?: string,
  ): Promise<any> {
    const data: any = {};

    if (options.xy) {
      data.color = { xy: { x: options.xy[0], y: options.xy[1] } };
    } else if (options.hue !== undefined && options.saturation !== undefined) {
      data.color = {
        hue: options.hue,
        saturation: options.saturation,
      };
    }

    return this.update(id, data, customApiKey);
  }
}

/**
 * Room resource client
 */
export class RoomClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/room');
  }

  // Get room lights
  async getLights(roomId: string, customApiKey?: string): Promise<any[]> {
    const room = await this.getById(roomId, customApiKey);
    return room.services.filter((service: any) => service.rtype === 'light');
  }
}

/**
 * Zone resource client
 */
export class ZoneClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/zone');
  }
}

/**
 * Scene resource client
 */
export class SceneClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/scene');
  }

  // Activate a scene
  async activate(sceneId: string, customApiKey?: string): Promise<any> {
    return this.update(
      sceneId,
      {
        recall: { action: 'active' },
      },
      customApiKey,
    );
  }
}

/**
 * Device resource client
 */
export class DeviceClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/device');
  }
}

/**
 * Bridge resource client
 */
export class BridgeClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/bridge');
  }

  // Get bridge configuration
  async getBridgeConfig(customApiKey?: string): Promise<any> {
    const bridges = await this.getAll(customApiKey);
    if (bridges.length > 0) {
      return bridges[0].config;
    }
    throw new Error('No bridge found');
  }
}

/**
 * Entertainment configuration client
 */
export class EntertainmentClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/entertainment_configuration');
  }

  // Start entertainment configuration
  async start(id: string, customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        action: { action: 'start' },
      },
      customApiKey,
    );
  }

  // Stop entertainment configuration
  async stop(id: string, customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        action: { action: 'stop' },
      },
      customApiKey,
    );
  }
}

/**
 * Base client for v1 API endpoints
 * Contains common functionality for v1 API clients
 */
export class BaseV1Client {
  protected readonly v1BaseUrl: string;

  constructor(
    protected readonly axios: AxiosInstance,
    protected readonly configGetter: (customApiKey?: string) => AxiosRequestConfig,
  ) {
    // Extract the bridge IP from the v2 URL to construct the v1 URL
    const v2Url = new URL(axios.defaults.baseURL || '');
    const bridgeIp = v2Url.hostname;
    this.v1BaseUrl = `http://${bridgeIp}/api`;
  }
}

/**
 * Config client for Hue API (v1 API endpoints)
 * Based on https://developers.meethue.com/develop/hue-api/7-configuration-api/
 */
export class ConfigClient extends BaseV1Client {
  // Get full configuration
  async getFullConfig(username: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(`${this.v1BaseUrl}/${username}`, this.configGetter(customApiKey));
    return response.data;
  }

  // Get configuration
  async getBridgeConfig(username: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(`${this.v1BaseUrl}/${username}/config`, this.configGetter(customApiKey));
    return response.data;
  }

  // Modify configuration
  async modifyConfig(username: string, configData: any, customApiKey?: string): Promise<any> {
    const response = await this.axios.put(
      `${this.v1BaseUrl}/${username}/config`,
      configData,
      this.configGetter(customApiKey),
    );
    return response.data;
  }

  // Delete user from whitelist
  async deleteUser(username: string, userToDelete: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.delete(
      `${this.v1BaseUrl}/${username}/config/whitelist/${userToDelete}`,
      this.configGetter(customApiKey),
    );
    return response.data;
  }

  // Get full state (datastore)
  async getFullState(username: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(`${this.v1BaseUrl}/${username}`, this.configGetter(customApiKey));
    return response.data;
  }
}

/**
 * User client for Hue API (v1 API endpoints)
 * Based on https://developers.meethue.com/develop/hue-api/7-configuration-api/
 */
export class UserClient extends BaseV1Client {
  // Create new user
  async createUser(deviceType: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.post(this.v1BaseUrl, { devicetype: deviceType }, this.configGetter(customApiKey));
    return response.data;
  }

  // Get all users (whitelist)
  async getAllUsers(username: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(
      `${this.v1BaseUrl}/${username}/config/whitelist`,
      this.configGetter(customApiKey),
    );
    return response.data;
  }

  // Get user information
  async getUser(username: string, userToGet: string, customApiKey?: string): Promise<any> {
    const response = await this.axios.get(
      `${this.v1BaseUrl}/${username}/config/whitelist/${userToGet}`,
      this.configGetter(customApiKey),
    );
    return response.data;
  }
}

/**
 * GroupedLight resource client for controlling multiple lights at once
 * Based on https://developers.meethue.com/develop/hue-api-v2/api-reference/
 */
export class GroupedLightClient extends ResourceClient {
  constructor(axios: AxiosInstance, getConfig: (customApiKey?: string) => AxiosRequestConfig) {
    super(axios, getConfig, '/resource/grouped_light');
  }

  /**
   * Turn on a grouped light
   * @param id Grouped light ID
   * @param brightness Optional brightness value (0-100)
   * @param customApiKey Optional custom API key
   */
  async turnOn(id: string, brightness?: number, customApiKey?: string): Promise<any> {
    const brightnessText = brightness !== undefined ? ` with brightness ${brightness}%` : '';
    console.log(`Turning on grouped light ${id}${brightnessText}`);

    const data: any = {
      on: { on: true },
    };

    if (brightness !== undefined) {
      data.dimming = { brightness };
    }

    return this.update(id, data, customApiKey);
  }

  /**
   * Turn off a grouped light
   * @param id Grouped light ID
   * @param customApiKey Optional custom API key
   */
  async turnOff(id: string, customApiKey?: string): Promise<any> {
    console.log(`Turning off grouped light ${id}`);

    return this.update(
      id,
      {
        on: { on: false },
      },
      customApiKey,
    );
  }

  /**
   * Set brightness of a grouped light
   * @param id Grouped light ID
   * @param brightness Brightness value (0-100)
   * @param customApiKey Optional custom API key
   */
  async setBrightness(id: string, brightness: number, customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        dimming: { brightness },
      },
      customApiKey,
    );
  }

  /**
   * Set color temperature of a grouped light
   * @param id Grouped light ID
   * @param mirek Color temperature in mirek (153-500)
   * @param customApiKey Optional custom API key
   */
  async setColorTemperature(id: string, mirek: number, customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        color_temperature: { mirek },
      },
      customApiKey,
    );
  }

  /**
   * Set color of a grouped light
   * @param id Grouped light ID
   * @param xy xy color coordinates [x, y]
   * @param customApiKey Optional custom API key
   */
  async setColor(id: string, xy: [number, number], customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        color: {
          xy: {
            x: xy[0],
            y: xy[1],
          },
        },
      },
      customApiKey,
    );
  }

  /**
   * Set alert effect for a grouped light
   * @param id Grouped light ID
   * @param effect Effect type: 'breathe'
   * @param customApiKey Optional custom API key
   */
  async setAlert(id: string, effect: 'breathe', customApiKey?: string): Promise<any> {
    return this.update(
      id,
      {
        alert: {
          action: effect,
        },
      },
      customApiKey,
    );
  }
}
