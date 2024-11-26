import { AgCharts, type AgChartOptions } from "ag-charts-community";
import type { SeasonData } from "./downloadData";

export function mapDataForChart(data: SeasonData[]) {
    return data.map((d) => ({
      id: `${d.showName} - ${d.id}`,
      criticScore: Number(d.rottenTomatoesData?.critics?.score) || null,
      audienceScore: Number(d.rottenTomatoesData?.audience?.score) || null,
      tmdbScore: Number(d.tmdbData?.voteAverage) || null,
      metaUserScore: Number(d.metaCriticData?.userScore) || null,
      metaScore: Number(d.metaCriticData?.metaScore) || null,
    }));
}

export function setupChart(data: ReturnType<typeof mapDataForChart>, element: HTMLElement) {
    const options: AgChartOptions = {
      container: element,
      title: {
        text: "Score Comparison",
      },
      data,
      axes: [
        {
          type: "number",
          position: "left",
          min: 0,
          max: 100,
          label: {
            formatter: function (params) {
              return params.value + "%";
            },
          },
          keys: ["criticScore", "audienceScore", "metaScore"],
        },
        {
          type: "number",
          position: "right",
          min: 0,
          max: 10,
          label: {
            formatter: function (params) {
              return params.value.toFixed(1);
            },
          },
          keys: ["tmdbScore", "metaUserScore"],
        },
        {
          type: "category",
          position: "bottom",
          label: {
            formatter: function (params) {
              return "Season " + params.value.split(" - ")[1];
            },
          },
        },
      ],
      series: [
        {
          type: "line",
          xKey: "id",
          yKey: "criticScore",
          yName: "Rotten Tomatoes Critic Score",
        },
        {
          type: "line",
          xKey: "id",
          yKey: "audienceScore",
          yName: "Rotten Tomatoes Audience Score",
        },
        {
          type: "line",
          xKey: "id",
          yKey: "tmdbScore",
          yName: "TMDB Score",
        },
        {
          type: "line",
          xKey: "id",
          yKey: "metaUserScore",
          yName: "MetaCritic User Score",
        },
        {
          type: "line",
          xKey: "id",
          yKey: "metaScore",
          yName: "MetaCritic Critic Score",
        },
      ],
    };

    AgCharts.create(options);
}