#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ArtistManager } from "./tools/artist-manager.js";
import { EventSearch } from "./tools/event-search.js";
import { SimilarArtists } from "./tools/similar-artists.js";
import { WebScraper } from "./tools/web-scraper.js";

const server = new Server(
  {
    name: "artist-events",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const artistManager = new ArtistManager();
const eventSearch = new EventSearch();
const similarArtists = new SimilarArtists();
const webScraper = new WebScraper();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_artist",
        description: "Fügt einen Künstler zur persönlichen Liste hinzu",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name des Künstlers" },
            type: {
              type: "string",
              enum: ["musician", "artist"],
              description: "Typ: musician (Musiker/Band) oder artist (bildender Künstler)",
            },
            genres: {
              type: "array",
              items: { type: "string" },
              description: "Genres (optional)",
            },
          },
          required: ["name", "type"],
        },
      },
      {
        name: "remove_artist",
        description: "Entfernt einen Künstler aus der Liste",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name des Künstlers" },
          },
          required: ["name"],
        },
      },
      {
        name: "list_artists",
        description: "Zeigt alle gespeicherten Künstler an",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["musician", "artist", "all"],
              description: "Filter nach Typ (optional, Standard: all)",
            },
          },
        },
      },
      {
        name: "search_events",
        description: "Sucht nach Konzerten und Events für gespeicherte Künstler oder einen bestimmten Künstler",
        inputSchema: {
          type: "object",
          properties: {
            artist_name: {
              type: "string",
              description: "Name eines bestimmten Künstlers (optional, sonst alle gespeicherten)",
            },
            location: {
              type: "string",
              description: "Stadt oder Region (z.B. 'Berlin', 'Allgäu')",
            },
            radius_km: {
              type: "number",
              description: "Suchradius in km (Standard: 100)",
            },
            date_from: {
              type: "string",
              description: "Startdatum YYYY-MM-DD (optional)",
            },
            date_to: {
              type: "string",
              description: "Enddatum YYYY-MM-DD (optional)",
            },
          },
          required: ["location"],
        },
      },
      {
        name: "find_similar_artists",
        description: "Findet ähnliche Künstler basierend auf einem Künstlernamen",
        inputSchema: {
          type: "object",
          properties: {
            artist_name: { type: "string", description: "Name des Künstlers" },
            limit: {
              type: "number",
              description: "Maximale Anzahl Ergebnisse (Standard: 10)",
            },
          },
          required: ["artist_name"],
        },
      },
      {
        name: "scrape_event_page",
        description: "Durchsucht eine beliebige Webseite nach Event-Informationen",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL der Webseite" },
            search_terms: {
              type: "array",
              items: { type: "string" },
              description: "Suchbegriffe zum Filtern (optional)",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "add_artist":
        return {
          content: [
            {
              type: "text",
              text: await artistManager.addArtist(
                args?.name as string,
                args?.type as "musician" | "artist",
                args?.genres as string[] | undefined
              ),
            },
          ],
        };

      case "remove_artist":
        return {
          content: [
            {
              type: "text",
              text: await artistManager.removeArtist(args?.name as string),
            },
          ],
        };

      case "list_artists":
        return {
          content: [
            {
              type: "text",
              text: await artistManager.listArtists(
                (args?.type as "musician" | "artist" | "all") || "all"
              ),
            },
          ],
        };

      case "search_events":
        return {
          content: [
            {
              type: "text",
              text: await eventSearch.search({
                artistName: args?.artist_name as string | undefined,
                location: args?.location as string,
                radiusKm: (args?.radius_km as number) || 100,
                dateFrom: args?.date_from as string | undefined,
                dateTo: args?.date_to as string | undefined,
              }),
            },
          ],
        };

      case "find_similar_artists":
        return {
          content: [
            {
              type: "text",
              text: await similarArtists.find(
                args?.artist_name as string,
                (args?.limit as number) || 10
              ),
            },
          ],
        };

      case "scrape_event_page":
        return {
          content: [
            {
              type: "text",
              text: await webScraper.scrape(
                args?.url as string,
                args?.search_terms as string[] | undefined
              ),
            },
          ],
        };

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Artist Events MCP Server running on stdio");
}

main().catch(console.error);
