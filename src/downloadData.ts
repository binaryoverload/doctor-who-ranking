import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { logger } from "@it-astro:logger"
import * as cheerio from "cheerio"
import seasonJson from "./seasons.json" assert { type: "json" }
import { TMDB_API_KEY } from "astro:env/server"

type RTSeasonData = {
  critics: {
    score: string
    rating: string
    sentiment: string
    likedCount: number
    notLikedCount: number
    reviewCount: number
  } | null
  audience: {
    score: string
    rating: string
    sentiment: string
    likedCount: number
    notLikedCount: number
    reviewCount: number
  } | null
}

type MetaCriticData = {
  metaScore: number | null
  userScore: number | null
}

type TmdbSeasonApiData = {
  id: number
  name: string
  season_number: number
  vote_average: number
  air_date: string
}

type TmdbSeasonData = {
  id: number
  name: string
  seasonNumber: number
  voteAverage: number
  airDate: string
}

export type SeasonData = {
  showId: string
  showName: string
  id: string
  name: string
  rottenTomatoesUrl: string
  metaCriticUrl: string
  tmdb: {
    seriesId: number
    seasonId: number
  }
  tmdbData?: TmdbSeasonData
  rottenTomatoesData?: RTSeasonData
  metaCriticData?: MetaCriticData
  meta: {
    showrunner: string
    doctor: string
    doctorPlayedBy: string
    startDate: string
    endDate: string
  }
}

type Cache = {
  sourceHash: string
  lastUpdated: string
  data: SeasonData[]
}

export async function downloadData() {
  logger.label = "data-downloader"
  const sourceFileData = await fs.readFile("src/seasons.json")
  const sourceHash = createHash("sha256").update(sourceFileData).digest("hex")

  if (import.meta.env.DEV) {
    try {
      logger.info("Attempting to read data from cache")
      const cacheData = JSON.parse(
        await fs.readFile("data-cache.json", "utf-8")
      ) as Cache

      const lastUpdated = new Date(cacheData.lastUpdated)
      const isOlderThan1Day =
        Date.now() - lastUpdated.getTime() > 1000 * 60 * 60 * 24

      if (cacheData.sourceHash === sourceHash && !isOlderThan1Day) {
        logger.info("Cache is up to date, using cached data")
        return cacheData.data
      }

      const reason =
        cacheData.sourceHash !== sourceHash
          ? "source hash mismatch"
          : "cache is older than 1 day"

      logger.info(`Cache is outdated (${reason}), redownloading data`)
    } catch {}
  }

  const seasonData = [...seasonJson] as SeasonData[]
  logger.info(
    `Starting fresh download of data for ${seasonData.length} seasons`
  )

  const series = seasonData.reduce(
    (acc, season) => {
      if (season.showId in acc) return acc
      acc[season.showId] = {
        id: season.showId,
        name: season.showName,
        tmdbId: season.tmdb.seriesId,
      }
      return acc
    },
    {} as Record<
      string,
      {
        id: string
        name: string
        tmdbId: number
      }
    >
  )

  const tmdbSeasons: TmdbSeasonData[] = []

  for (const showId in series) {
    const show = series[showId]
    logger.info(`Downloading data for series ${show.id} (${show.name})`)
    const tmdbData = await downloadTmbdSeriesData(show.tmdbId)
    tmdbSeasons.push(...tmdbData.seasons.map(mapTmdbData))
  }

  for (const season of seasonData) {
    logger.info(`Downloading data for season ${season.id} (${season.name})`)

    const rtData = await downloadRTData(season.rottenTomatoesUrl)
    const metaCriticData = await downloadMetaCriticData(season.metaCriticUrl)
    const tmdbData = tmdbSeasons.find(
      (seasonData) => season.tmdb.seasonId === seasonData.id
    )

    season.rottenTomatoesData = rtData
    season.metaCriticData = metaCriticData
    season.tmdbData = tmdbData
  }

  if (import.meta.env.DEV) {
    const cacheData: Cache = {
      sourceHash,
      lastUpdated: new Date().toISOString(),
      data: seasonData,
    }
    await fs.writeFile("data-cache.json", JSON.stringify(cacheData, null, 2))
  }
  return seasonData
}

async function downloadRTData(rtUrl: string): Promise<RTSeasonData> {
  logger.debug(`Downloading data from ${rtUrl}`)
  const page = await fetch(rtUrl).then((res) => res.text())
  const $ = cheerio.load(page)
  const mediaDataJson = $("#media-scorecard-json").text()
  const mediaData = JSON.parse(mediaDataJson)

  const data = {
    critics: mediaData.criticsScore.score
      ? {
          score: mediaData.criticsScore.score,
          rating: mediaData.criticsScore.averageRating,
          sentiment: mediaData.criticsScore.sentiment,
          likedCount: mediaData.criticsScore.likedCount,
          notLikedCount: mediaData.criticsScore.notLikedCount,
          reviewCount: mediaData.criticsScore.reviewCount,
        }
      : null,

    audience: mediaData.audienceScore.score
      ? {
          score: mediaData.audienceScore.score,
          rating: mediaData.audienceScore.averageRating,
          sentiment: mediaData.audienceScore.sentiment,
          likedCount: mediaData.audienceScore.likedCount,
          notLikedCount: mediaData.audienceScore.notLikedCount,
          reviewCount: mediaData.audienceScore.reviewCount,
        }
      : null,
  }

  logger.debug(`Finished downloading data from ${rtUrl}`)
  return data
}

async function downloadMetaCriticData(
  metaCriticUrl: string
): Promise<MetaCriticData> {
  logger.debug(`Downloading data from ${metaCriticUrl}`)
  const page = await fetch(metaCriticUrl).then((res) => res.text())
  const $ = cheerio.load(page)
  const metaScore = $(
    '.c-productHero_scoreInfo .c-siteReviewScore[title*="Metascore"] span'
  ).text()
  const userScore = $(
    '.c-productHero_scoreInfo .c-siteReviewScore[title*="User score"] span'
  ).text()
  const data = {
    metaScore: Number(metaScore) || null,
    userScore: Number(userScore) || null,
  }
  logger.debug(`Finished downloading data from ${metaCriticUrl}`)
  return data
}

async function downloadTmbdSeriesData(seriesId: number) {
  const url = `https://api.themoviedb.org/3/tv/${seriesId}?language=en-GB`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  })
  const data = await response.json()
  return data as {
    seasons: TmdbSeasonApiData[]
  }
}

function mapTmdbData(data: TmdbSeasonApiData): TmdbSeasonData {
  return {
    id: data.id,
    name: data.name,
    seasonNumber: data.season_number,
    voteAverage: data.vote_average,
    airDate: data.air_date,
  }
}
