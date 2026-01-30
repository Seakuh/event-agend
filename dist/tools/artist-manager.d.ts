export interface Artist {
    name: string;
    type: "musician" | "artist";
    genres?: string[];
    addedAt: string;
}
export declare class ArtistManager {
    private dataDir;
    private dataFile;
    constructor();
    private ensureDataDir;
    private loadData;
    private saveData;
    addArtist(name: string, type: "musician" | "artist", genres?: string[]): Promise<string>;
    removeArtist(name: string): Promise<string>;
    listArtists(type?: "musician" | "artist" | "all"): Promise<string>;
    getArtists(): Promise<Artist[]>;
}
