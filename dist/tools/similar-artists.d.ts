export declare class SimilarArtists {
    find(artistName: string, limit?: number): Promise<string>;
    private searchLastFm;
    private searchMusicBrainz;
}
