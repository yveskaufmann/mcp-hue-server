import dnssd from 'dnssd';
import { HueApiClient } from './hue-api-client.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface HueCredentials {
  username: string;
  clientKey: string;
}

export class PhillipsHueService {
  private bridgeIp: string;
  private hueUsername: string;
  private hueClientKey: string;
  private apiClient: HueApiClient | null = null;

  constructor(args?: { bridgeIp: string; hueUsername: string; hueClientKey: string }) {
    this.bridgeIp = args?.bridgeIp ?? process.env.HUE_BRIDGE_IP;
    this.hueUsername = args?.hueUsername ?? process.env.HUE_USERNAME;
    this.hueClientKey = args?.hueClientKey ?? process.env.HUE_CLIENT_KEY;
  }

  async discoverBridge() {
    if (this.bridgeIp) {
      console.error(`Bridge IP is already known: ${this.bridgeIp}`);
      return this.bridgeIp;
    }

    const browser = new dnssd.Browser(dnssd.tcp('hue'));

    return new Promise<string>((resolve, reject) => {
      browser
        .on('serviceUp', (service) => {
          console.error(`Found Hue Bridge: ${service.name} at ${service.addresses[0]}`);
          this.bridgeIp = service.addresses[0]; // Assuming the first address is the desired one
          resolve(this.bridgeIp);

          browser.stop();
        })
        .on('error', (err) => {
          console.error('Error discovering Hue Bridge:', err);
          reject(new Error(`Failed to discover bridge: ${err.message}`));
        });

      browser.start();
    });
  }

  async getApiClient(): Promise<HueApiClient> {
    if (!this.apiClient) {
      if (!this.bridgeIp) {
        await this.discoverBridge();
      }

      if (!this.hueUsername || !this.hueClientKey) {
        const credentials = await this.getHueCredentials();
        this.hueUsername = credentials.username;
        this.hueClientKey = credentials.clientKey;
      }

      if (!this.bridgeIp || !this.hueClientKey) {
        throw new Error('Bridge IP or API key not available. Please ensure they are provided.');
      }

      this.apiClient = new HueApiClient({
        bridgeIp: this.bridgeIp,
        apiKey: this.hueClientKey,
      });
    }

    return this.apiClient;
  }

  private async createNewHueUser(): Promise<HueCredentials> {
    if (!this.bridgeIp) {
      await this.discoverBridge();
    }

    if (!this.bridgeIp) {
      throw new Error('Cannot create credentials: Bridge IP not available');
    }

    console.error('Creating new Hue user...');
    console.error('Press the link button on your Hue Bridge...');

    // Wait a moment for the user to press the button
    await new Promise((resolve) => setTimeout(resolve, 1000 * 10));

    try {
      // Create a temporary API client just for creating a new user
      const tempClient = new HueApiClient({
        bridgeIp: this.bridgeIp,
        apiKey: '', // No API key needed for user creation
      });

      // Use the user client to create a new user
      const response = await tempClient.user.createUser('hue-mcp-server#server');
      const data = response[0];

      if (data.error) {
        throw new Error(`Failed to create Hue user: ${data.error.description}`);
      }

      if (!data.success?.username) {
        throw new Error('Failed to create Hue user: Unexpected response format');
      }

      const credentials: HueCredentials = {
        username: data.success.username,
        clientKey: data.success.username, // In v1 API, clientKey is same as username
      };

      return credentials;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create Hue user: ${error.message}`);
      } else {
        throw new Error('Failed to create Hue user: Unknown error');
      }
    }
  }

  private getCredentialsPath(): string {
    return process.env.HUE_CREDENTIALS_PATH || path.join(os.homedir(), '.hue-credentials.json');
  }

  private async readCredentialsFromFile(): Promise<HueCredentials | null> {
    const credentialsPath = this.getCredentialsPath();

    try {
      const fileContent = await fs.readFile(credentialsPath, 'utf-8');
      const credentials = JSON.parse(fileContent) as HueCredentials;

      if (credentials.username && credentials.clientKey) {
        console.error(`Loaded Hue credentials from ${credentialsPath}`);
        return credentials;
      }

      console.error('Invalid credentials in config file');
      return null;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist
        console.error(`No credentials file found at ${credentialsPath}`);
      } else {
        // Other errors (permission issues, etc.)
        console.error('Error reading credentials file:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }

  private async saveCredentialsToFile(credentials: HueCredentials): Promise<void> {
    const credentialsPath = this.getCredentialsPath();

    try {
      await fs.mkdir(path.dirname(credentialsPath), { recursive: true });
      await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2), 'utf-8');
      console.error(`Saved new Hue credentials to ${credentialsPath}`);
    } catch (error) {
      console.error('Failed to save credentials to file:', error);
      // We don't throw here because the credentials are still valid and usable
    }
  }

  async getHueCredentials(): Promise<HueCredentials> {
    // Try to load from file first
    const existingCredentials = await this.readCredentialsFromFile();
    if (existingCredentials) {
      return existingCredentials;
    }

    // Create new credentials if none exist
    const newCredentials = await this.createNewHueUser();

    // Save the new credentials
    await this.saveCredentialsToFile(newCredentials);

    return newCredentials;
  }

  async turnLightOn(lightName: string, brightness = 100): Promise<void> {
    const light = await this.findLightByName(lightName);
    const client = await this.getApiClient();

    // Turn on the light
    await client.light.turnOn(light.id, brightness);

    console.error(`Light '${lightName}' turned on with brightness ${brightness}%`);
  }

  async turnLightOff(lightName: string): Promise<void> {
    const light = await this.findLightByName(lightName);
    const client = await this.getApiClient();

    // Turn off the light
    await client.light.turnOff(light.id);

    console.error(`Light '${lightName}' turned off`);
  }

  /**
   * Helper method to find a light by name
   */
  private async findLightByName(lightName: string): Promise<any> {
    const client = await this.getApiClient();

    // Get all lights
    const lights = await client.light.getAll();

    // Find the light by name
    const light = lights.find((l) => l.metadata?.name === lightName);

    if (!light) {
      throw new Error(`Light with name '${lightName}' not found`);
    }

    return light;
  }

  async listAllLights(): Promise<string[]> {
    const client = await this.getApiClient();

    // Get all lights
    const lights = await client.light.getAll();

    // Extract and sort light names
    return lights.map((l) => l.metadata?.name || `Light ${l.id}`).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Turn on all lights in a room using the grouped light functionality
   * @param roomName Name of the room
   * @param brightness Optional brightness level (0-100)
   */
  async turnOnRoomLights(roomName: string, brightness = 100): Promise<void> {
    const room = await this.findRoomByName(roomName);
    const client = await this.getApiClient();

    // Find the grouped_light service for this room
    const groupedLightService = room.services?.find((service: any) => service.rtype === 'grouped_light');

    if (!groupedLightService?.rid) {
      throw new Error(`No grouped light service found for room '${roomName}'`);
    }

    // Use the grouped light to control all lights in the room with one request
    await client.groupedLight.turnOn(groupedLightService.rid, brightness);
    console.error(`All lights in room '${roomName}' turned on with brightness ${brightness}%`);
  }

  /**
   * Turn off all lights in a room using the grouped light functionality
   * @param roomName Name of the room
   */
  async turnOffRoomLights(roomName: string): Promise<void> {
    const room = await this.findRoomByName(roomName);
    const client = await this.getApiClient();

    // Find the grouped_light service for this room
    const groupedLightService = room.services?.find((service: any) => service.rtype === 'grouped_light');

    if (!groupedLightService?.rid) {
      throw new Error(`No grouped light service found for room '${roomName}'`);
    }

    // Use the grouped light to control all lights in the room with one request
    await client.groupedLight.turnOff(groupedLightService.rid);
    console.error(`All lights in room '${roomName}' turned off`);
  }

  /**
   * Get all rooms from the Hue bridge
   */
  async listAllRooms(): Promise<string[]> {
    const client = await this.getApiClient();

    // Get all rooms
    const rooms = await client.room.getAll();

    // Extract and sort room names
    return rooms.map((r) => r.metadata?.name || `Room ${r.id}`).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Helper method to find a room by name
   */
  private async findRoomByName(roomName: string): Promise<any> {
    const client = await this.getApiClient();

    // Get all rooms
    const rooms = await client.room.getAll();

    // Find the room by name (case-insensitive)
    const room = rooms.find((r) => r.metadata?.name?.toLowerCase() === roomName.toLowerCase());

    if (!room) {
      throw new Error(`Room with name '${roomName}' not found`);
    }

    return room;
  }
}
