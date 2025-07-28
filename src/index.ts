import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import pkg from '../package.json' with { type: 'json' };
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import z from 'zod';
import { PhillipsHueService } from './hue-service.js';

const hueService = new PhillipsHueService();

const server = new McpServer({
  name: pkg.name,
  version: pkg.version,
});

server.registerTool(
  'turnLightOn',
  {
    title: 'Turn Light On',
    description: 'Turns on a light by providing its name',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    try {
      await hueService.turnLightOn(name);
      return {
        content: [{ type: 'text', text: `Successfully turned on light: ${name}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to turn on light: ${errorMessage}` }],
      };
    }
  },
);

server.registerTool(
  'turnLightOff',
  {
    title: 'Turn Light Off',
    description: 'Turns off a light by providing its name',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    try {
      await hueService.turnLightOff(name);
      return {
        content: [{ type: 'text', text: `Successfully turned on light: ${name}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to turn off light: ${errorMessage}` }],
      };
    }
  },
);

server.registerTool(
  'listAllLights',
  {
    title: 'List All Lights',
    description: 'List all the available light names',
  },
  async ({ name }) => {
    try {
      const lights = await hueService.listAllLights();
      return {
        content: [{ type: 'text', text: `The available lights are: ${lights.join(', ')}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to list lights: ${errorMessage}` }],
      };
    }
  },
);

server.registerTool(
  'listAllRooms',
  {
    title: 'List All Rooms',
    description: 'List all the available room names',
  },
  async () => {
    try {
      const rooms = await hueService.listAllRooms();
      return {
        content: [{ type: 'text', text: `The available rooms are: ${rooms.join(', ')}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to list rooms: ${errorMessage}` }],
      };
    }
  },
);

server.registerTool(
  'turnRoomLightsOn',
  {
    title: 'Turn Room Lights On',
    description: 'Turns on all lights in a room by providing the room name',
    inputSchema: { name: z.string(), brightness: z.number().optional() },
  },
  async ({ name, brightness }) => {
    try {
      await hueService.turnOnRoomLights(name, brightness);
      return {
        content: [{ type: 'text', text: `Successfully turned on all lights in room: ${name}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to turn on room lights: ${errorMessage}` }],
      };
    }
  },
);

server.registerTool(
  'turnRoomLightsOff',
  {
    title: 'Turn Room Lights Off',
    description: 'Turns off all lights in a room by providing the room name',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    try {
      await hueService.turnOffRoomLights(name);
      return {
        content: [{ type: 'text', text: `Successfully turned off all lights in room: ${name}` }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to turn off room lights: ${errorMessage}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
