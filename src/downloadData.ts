import seasonJson from "./seasons.json" assert { type: "json" };
import { logger } from '@it-astro:logger';
import * as cheerio from 'cheerio';
import { log } from "console";
import * as fs from 'fs/promises';
import { createHash } from "crypto" 

type RTData = {
    critics: {
        score: string;
        rating: string;
        sentiment: string;
        likedCount: number;
        notLikedCount: number;
        reviewCount: number;
    } | null;
    audience: {
        score: string;
        rating: string;
        sentiment: string;
        likedCount: number;
        notLikedCount: number;
        reviewCount: number;
    } | null;
}

export type SeasonData = {
    show: string;
    showName: string;
    id: string;
    name: string;
    rottenTomatoesUrl: string;
    rottenTomatoesData?: RTData;
    special?: boolean | undefined;
}

type Cache = {
    sourceHash: string;
    lastUpdated: string;
    data: SeasonData[];
}

export async function downloadData() {
    logger.label = "data-downloader";
    const sourceFileData = await fs.readFile("src/seasons.json")
    const sourceHash = createHash('sha256').update(sourceFileData).digest('hex');

    if (import.meta.env.DEV) {
        try {
            logger.info("Attempting to read data from cache");
            const cacheData = JSON.parse(await fs.readFile("data-cache.json", 'utf-8')) as Cache;

            const lastUpdated = new Date(cacheData.lastUpdated);
            const isOlderThan1Day = (Date.now() - lastUpdated.getTime()) > 1000 * 60 * 60 * 24;

            if (cacheData.sourceHash === sourceHash && !isOlderThan1Day) {
                logger.info("Cache is up to date, using cached data");
                return cacheData.data;
            }

            const reason = cacheData.sourceHash !== sourceHash ? "source hash mismatch" : "cache is older than 1 day";

            logger.info(`Cache is outdated (${reason}), redownloading data`);
        } catch {}
    }

    let seasonData = [...seasonJson] as SeasonData[];

    logger.info(`Starting fresh download of data for ${seasonData.length} seasons`);

    for (const season of seasonData) {
        logger.info(`Downloading data for season ${season.id} (${season.name})`);
        
        const rtData = await downloadRTData(season.rottenTomatoesUrl);
    
        season.rottenTomatoesData = rtData;
    }

    if (import.meta.env.DEV) {
        const cacheData: Cache = {
            sourceHash,
            lastUpdated: new Date().toISOString(),
            data: seasonData
        }
        await fs.writeFile("data-cache.json", JSON.stringify(cacheData, null, 2))
    }
    return seasonData;
}

async function downloadRTData(rtUrl: string): Promise<RTData> {
    const page = await fetch(rtUrl).then(res => res.text());
    const $ = cheerio.load(page);
    const mediaDataJson = $('#media-scorecard-json').text();
    const mediaData = JSON.parse(mediaDataJson);

    const data = {
        critics: mediaData.criticsScore.score ? {
            score: mediaData.criticsScore.score,
            rating: mediaData.criticsScore.averageRating,
            sentiment: mediaData.criticsScore.sentiment,
            likedCount: mediaData.criticsScore.likedCount,
            notLikedCount: mediaData.criticsScore.notLikedCount,
            reviewCount: mediaData.criticsScore.reviewCount
        } : null,

        audience: mediaData.audienceScore.score ?{
            score: mediaData.audienceScore.score,
            rating: mediaData.audienceScore.averageRating,
            sentiment: mediaData.audienceScore.sentiment,
            likedCount: mediaData.audienceScore.likedCount,
            notLikedCount: mediaData.audienceScore.notLikedCount,
            reviewCount: mediaData.audienceScore.reviewCount
        } : null
    }

    return data;
}