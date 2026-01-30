export interface Event {
    artist: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    country: string;
    ticketUrl?: string;
    source: string;
}
interface SearchParams {
    artistName?: string;
    location: string;
    radiusKm: number;
    dateFrom?: string;
    dateTo?: string;
}
export declare class EventSearch {
    private artistManager;
    constructor();
    search(params: SearchParams): Promise<string>;
    private searchBandsintown;
    private searchSongkick;
    private deduplicateEvents;
    private formatEvents;
}
export {};
