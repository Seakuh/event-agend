import axios from "axios";
import * as cheerio from "cheerio";

interface SimilarArtist {
  name: string;
  match?: number;
  genres?: string[];
  source: string;
}

export class SimilarArtists {
  async find(artistName: string, limit: number = 10): Promise<string> {
    const [lastfmResults, spotifyResults] = await Promise.all([
      this.searchLastFm(artistName),
      this.searchMusicBrainz(artistName),
    ]);

    const allResults = [...lastfmResults, ...spotifyResults];

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = allResults.filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by match score if available
    unique.sort((a, b) => (b.match || 0) - (a.match || 0));

    const limited = unique.slice(0, limit);

    if (limited.length === 0) {
      return `Keine ähnlichen Künstler für "${artistName}" gefunden.`;
    }

    let result = `**Ähnliche Künstler zu "${artistName}"** (${limited.length} gefunden)\n\n`;

    limited.forEach((a, i) => {
      const matchStr = a.match ? ` (${Math.round(a.match * 100)}% Match)` : "";
      const genreStr = a.genres?.length ? ` - ${a.genres.join(", ")}` : "";
      result += `${i + 1}. **${a.name}**${matchStr}${genreStr}\n`;
      result += `   Quelle: ${a.source}\n\n`;
    });

    return result.trim();
  }

  private async searchLastFm(artistName: string): Promise<SimilarArtist[]> {
    try {
      // Scrape Last.fm similar artists page (no API key needed)
      const encodedArtist = encodeURIComponent(artistName.replace(/ /g, "+"));
      const url = `https://www.last.fm/music/${encodedArtist}/+similar`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
        },
      });

      const $ = cheerio.load(response.data);
      const artists: SimilarArtist[] = [];

      $(".similar-artists-item, .grid-items-item").each((_, el) => {
        const $el = $(el);
        const name =
          $el.find(".grid-items-item-main-text, .link-block-target").text().trim() ||
          $el.find("a").first().text().trim();

        if (name && name.toLowerCase() !== artistName.toLowerCase()) {
          artists.push({
            name,
            source: "Last.fm",
          });
        }
      });

      return artists;
    } catch {
      return [];
    }
  }

  private async searchMusicBrainz(artistName: string): Promise<SimilarArtist[]> {
    try {
      // MusicBrainz API (no key needed, rate limited)
      const encodedArtist = encodeURIComponent(artistName);
      const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedArtist}&fmt=json`;

      const searchResponse = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "ArtistEventsMCP/1.0.0 (contact@example.com)",
        },
      });

      if (!searchResponse.data.artists?.length) {
        return [];
      }

      const artistId = searchResponse.data.artists[0].id;

      // Get artist relations
      const artistUrl = `https://musicbrainz.org/ws/2/artist/${artistId}?inc=artist-rels+tags&fmt=json`;

      const artistResponse = await axios.get(artistUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "ArtistEventsMCP/1.0.0 (contact@example.com)",
        },
      });

      const relations = artistResponse.data.relations || [];
      const tags = artistResponse.data.tags?.map((t: any) => t.name) || [];

      const similar: SimilarArtist[] = relations
        .filter(
          (r: any) =>
            r.type === "member of band" ||
            r.type === "collaboration" ||
            r.type === "supporting musician"
        )
        .map((r: any) => ({
          name: r.artist?.name || r.target?.name,
          genres: tags.slice(0, 3),
          source: "MusicBrainz",
        }))
        .filter((a: SimilarArtist) => a.name);

      return similar;
    } catch {
      return [];
    }
  }
}
