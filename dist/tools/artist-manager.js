import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
export class ArtistManager {
    dataDir;
    dataFile;
    constructor() {
        this.dataDir = join(homedir(), ".artist-events");
        this.dataFile = join(this.dataDir, "artists.json");
    }
    async ensureDataDir() {
        if (!existsSync(this.dataDir)) {
            await mkdir(this.dataDir, { recursive: true });
        }
    }
    async loadData() {
        await this.ensureDataDir();
        try {
            const content = await readFile(this.dataFile, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return { artists: [] };
        }
    }
    async saveData(data) {
        await this.ensureDataDir();
        await writeFile(this.dataFile, JSON.stringify(data, null, 2));
    }
    async addArtist(name, type, genres) {
        const data = await this.loadData();
        const exists = data.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            return `"${name}" ist bereits in deiner Liste.`;
        }
        const artist = {
            name,
            type,
            genres,
            addedAt: new Date().toISOString(),
        };
        data.artists.push(artist);
        await this.saveData(data);
        const typeLabel = type === "musician" ? "Musiker/Band" : "Künstler";
        const genreInfo = genres?.length ? ` (${genres.join(", ")})` : "";
        return `${typeLabel} "${name}"${genreInfo} wurde hinzugefügt.`;
    }
    async removeArtist(name) {
        const data = await this.loadData();
        const index = data.artists.findIndex((a) => a.name.toLowerCase() === name.toLowerCase());
        if (index === -1) {
            return `"${name}" wurde nicht in deiner Liste gefunden.`;
        }
        const removed = data.artists.splice(index, 1)[0];
        await this.saveData(data);
        return `"${removed.name}" wurde aus deiner Liste entfernt.`;
    }
    async listArtists(type = "all") {
        const data = await this.loadData();
        let artists = data.artists;
        if (type !== "all") {
            artists = artists.filter((a) => a.type === type);
        }
        if (artists.length === 0) {
            if (type === "all") {
                return "Deine Künstlerliste ist leer. Füge Künstler mit add_artist hinzu.";
            }
            return `Keine ${type === "musician" ? "Musiker" : "Künstler"} in deiner Liste.`;
        }
        const musicians = artists.filter((a) => a.type === "musician");
        const visualArtists = artists.filter((a) => a.type === "artist");
        let result = `**Deine Künstler (${artists.length} gesamt)**\n\n`;
        if (musicians.length > 0 && (type === "all" || type === "musician")) {
            result += "**Musiker/Bands:**\n";
            musicians.forEach((a) => {
                const genres = a.genres?.length ? ` - ${a.genres.join(", ")}` : "";
                result += `- ${a.name}${genres}\n`;
            });
            result += "\n";
        }
        if (visualArtists.length > 0 && (type === "all" || type === "artist")) {
            result += "**Bildende Künstler:**\n";
            visualArtists.forEach((a) => {
                const genres = a.genres?.length ? ` - ${a.genres.join(", ")}` : "";
                result += `- ${a.name}${genres}\n`;
            });
        }
        return result.trim();
    }
    async getArtists() {
        const data = await this.loadData();
        return data.artists;
    }
}
