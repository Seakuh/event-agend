import axios from "axios";
import * as cheerio from "cheerio";
export class WebScraper {
    async scrape(url, searchTerms) {
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
                    Accept: "text/html,application/xhtml+xml",
                },
            });
            const $ = cheerio.load(response.data);
            // Remove script and style elements
            $("script, style, nav, footer, header").remove();
            // Extract page title
            const title = $("title").text().trim() || "Unbekannt";
            // Find all potential event containers
            const events = [];
            // Common event selectors
            const eventSelectors = [
                '[class*="event"]',
                '[class*="veranstaltung"]',
                '[class*="concert"]',
                '[class*="show"]',
                '[class*="termin"]',
                '[class*="date"]',
                "article",
                ".listing",
                ".item",
                "li",
            ];
            const processedTexts = new Set();
            for (const selector of eventSelectors) {
                $(selector).each((_, el) => {
                    const $el = $(el);
                    const text = $el.text().replace(/\s+/g, " ").trim();
                    // Skip if too short, too long, or already processed
                    if (text.length < 10 || text.length > 500 || processedTexts.has(text)) {
                        return;
                    }
                    // Check if matches search terms
                    if (searchTerms?.length) {
                        const textLower = text.toLowerCase();
                        const matches = searchTerms.some((term) => textLower.includes(term.toLowerCase()));
                        if (!matches)
                            return;
                    }
                    // Look for dates
                    const datePatterns = [
                        /\d{1,2}\.\d{1,2}\.\d{2,4}/,
                        /\d{1,2}\/\d{1,2}\/\d{2,4}/,
                        /\d{4}-\d{2}-\d{2}/,
                        /\d{1,2}\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/i,
                        /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
                    ];
                    let foundDate;
                    for (const pattern of datePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            foundDate = match[0];
                            break;
                        }
                    }
                    // Get link if present
                    const link = $el.find("a").attr("href") || $el.attr("href");
                    const fullLink = link?.startsWith("http")
                        ? link
                        : link
                            ? new URL(link, url).href
                            : undefined;
                    processedTexts.add(text);
                    events.push({
                        text: text.substring(0, 300),
                        date: foundDate,
                        link: fullLink,
                    });
                });
            }
            // If no structured events found, try to find any date-related content
            if (events.length === 0) {
                const bodyText = $("body").text();
                const dateMatches = bodyText.match(/[^\n]{0,100}\d{1,2}\.\d{1,2}\.\d{2,4}[^\n]{0,100}/g);
                if (dateMatches) {
                    dateMatches.slice(0, 20).forEach((match) => {
                        const cleaned = match.replace(/\s+/g, " ").trim();
                        if (cleaned.length > 10 && !processedTexts.has(cleaned)) {
                            processedTexts.add(cleaned);
                            events.push({
                                text: cleaned,
                                date: cleaned.match(/\d{1,2}\.\d{1,2}\.\d{2,4}/)?.[0],
                            });
                        }
                    });
                }
            }
            // Format results
            if (events.length === 0) {
                return `Keine Event-Informationen auf "${title}" (${url}) gefunden.\n\nTipp: Versuche spezifischere Suchbegriffe.`;
            }
            let result = `**Gefundene Informationen auf "${title}"**\n`;
            result += `URL: ${url}\n`;
            result += `${events.length} potentielle Einträge gefunden\n\n`;
            events.slice(0, 30).forEach((e, i) => {
                result += `**${i + 1}.** `;
                if (e.date)
                    result += `[${e.date}] `;
                result += `${e.text}\n`;
                if (e.link)
                    result += `   Link: ${e.link}\n`;
                result += "\n";
            });
            return result.trim();
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === "ENOTFOUND") {
                    return `Fehler: URL "${url}" nicht erreichbar.`;
                }
                if (error.response?.status === 403) {
                    return `Fehler: Zugriff auf "${url}" verweigert (403).`;
                }
                if (error.response?.status === 404) {
                    return `Fehler: Seite "${url}" nicht gefunden (404).`;
                }
            }
            return `Fehler beim Laden von "${url}": ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
