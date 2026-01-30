import axios from "axios";
import * as cheerio from "cheerio";
import { ArtistManager } from "./artist-manager.js";
export class EventSearch {
    artistManager;
    constructor() {
        this.artistManager = new ArtistManager();
    }
    async search(params) {
        const { artistName, location, radiusKm, dateFrom, dateTo } = params;
        let artistsToSearch = [];
        if (artistName) {
            artistsToSearch = [artistName];
        }
        else {
            const saved = await this.artistManager.getArtists();
            const musicians = saved.filter((a) => a.type === "musician");
            if (musicians.length === 0) {
                return "Keine Musiker in deiner Liste. Füge welche hinzu oder gib einen Künstlernamen an.";
            }
            artistsToSearch = musicians.map((a) => a.name);
        }
        const allEvents = [];
        for (const artist of artistsToSearch) {
            const [bandsintownEvents, songkickEvents] = await Promise.all([
                this.searchBandsintown(artist, location),
                this.searchSongkick(artist, location),
            ]);
            allEvents.push(...bandsintownEvents, ...songkickEvents);
        }
        // Filter by date if specified
        let filteredEvents = allEvents;
        if (dateFrom || dateTo) {
            filteredEvents = allEvents.filter((e) => {
                const eventDate = new Date(e.date);
                if (dateFrom && eventDate < new Date(dateFrom))
                    return false;
                if (dateTo && eventDate > new Date(dateTo))
                    return false;
                return true;
            });
        }
        // Sort by date
        filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // Remove duplicates
        const uniqueEvents = this.deduplicateEvents(filteredEvents);
        if (uniqueEvents.length === 0) {
            return `Keine Events gefunden für ${artistsToSearch.join(", ")} in ${location}.`;
        }
        return this.formatEvents(uniqueEvents, location);
    }
    async searchBandsintown(artist, location) {
        try {
            const encodedArtist = encodeURIComponent(artist);
            const url = `https://rest.bandsintown.com/artists/${encodedArtist}/events?app_id=artist-events-mcp`;
            const response = await axios.get(url, { timeout: 10000 });
            if (!Array.isArray(response.data)) {
                return [];
            }
            const locationLower = location.toLowerCase();
            return response.data
                .filter((event) => {
                const city = event.venue?.city?.toLowerCase() || "";
                const region = event.venue?.region?.toLowerCase() || "";
                const country = event.venue?.country?.toLowerCase() || "";
                return (city.includes(locationLower) ||
                    region.includes(locationLower) ||
                    country.includes(locationLower) ||
                    locationLower.includes(city));
            })
                .map((event) => ({
                artist,
                title: event.title || `${artist} Live`,
                date: event.datetime?.split("T")[0] || "TBA",
                venue: event.venue?.name || "TBA",
                city: event.venue?.city || "",
                country: event.venue?.country || "",
                ticketUrl: event.url,
                source: "Bandsintown",
            }));
        }
        catch {
            return [];
        }
    }
    async searchSongkick(artist, location) {
        try {
            // Songkick public search page scraping
            const encodedArtist = encodeURIComponent(artist);
            const url = `https://www.songkick.com/search?utf8=%E2%9C%93&type=artists&query=${encodedArtist}`;
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
                },
            });
            const $ = cheerio.load(response.data);
            const events = [];
            // Find artist page link and fetch events
            const artistLink = $('a[href*="/artists/"]').first().attr("href");
            if (artistLink) {
                const artistUrl = `https://www.songkick.com${artistLink}/calendar`;
                const eventsResponse = await axios.get(artistUrl, {
                    timeout: 10000,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
                    },
                });
                const $events = cheerio.load(eventsResponse.data);
                const locationLower = location.toLowerCase();
                $events(".event-listings li").each((_, el) => {
                    const $el = $events(el);
                    const eventCity = $el.find(".location").text().toLowerCase();
                    if (eventCity.includes(locationLower) ||
                        locationLower.includes(eventCity.split(",")[0].trim())) {
                        events.push({
                            artist,
                            title: $el.find(".artists").text().trim() || `${artist} Live`,
                            date: $el.find("time").attr("datetime")?.split("T")[0] || "TBA",
                            venue: $el.find(".venue-name").text().trim() || "TBA",
                            city: $el.find(".location").text().trim(),
                            country: "",
                            ticketUrl: $el.find("a").attr("href")
                                ? `https://www.songkick.com${$el.find("a").attr("href")}`
                                : undefined,
                            source: "Songkick",
                        });
                    }
                });
            }
            return events;
        }
        catch {
            return [];
        }
    }
    deduplicateEvents(events) {
        const seen = new Set();
        return events.filter((e) => {
            const key = `${e.artist}-${e.date}-${e.venue}`.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    formatEvents(events, location) {
        let result = `**Events in/um ${location}** (${events.length} gefunden)\n\n`;
        events.forEach((e) => {
            result += `**${e.date}** - ${e.artist}\n`;
            result += `  Venue: ${e.venue}, ${e.city}\n`;
            if (e.ticketUrl) {
                result += `  Tickets: ${e.ticketUrl}\n`;
            }
            result += `  (${e.source})\n\n`;
        });
        return result.trim();
    }
}
