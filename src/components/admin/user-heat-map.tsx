"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { scaleQuantize } from "d3-scale";

// US states topojson — 110m resolution, hosted by the topojson-atlas
// project. ComposableMap fetches and caches it.
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Census/FIPS state code (string padded to 2) → USPS 2-letter code.
const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY",
};

type Row = { state: string; count: number };

export function UserHeatMap({ rows }: { rows: Row[] }) {
  const byState = useMemo(
    () => new Map(rows.map((r) => [r.state.toUpperCase(), r.count])),
    [rows],
  );
  const max = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.count), 0),
    [rows],
  );

  // Five-step orange ramp keyed off the brand color (#f26a42). Lighter for
  // low counts, darker for high. States with zero get a neutral gray.
  const colorScale = useMemo(
    () =>
      scaleQuantize<string>()
        .domain([1, Math.max(1, max)])
        .range([
          "#fde6dc",
          "#fbbfa1",
          "#f88d5e",
          "#ef5d22",
          "#bf3a0a",
        ]),
    [max],
  );

  return (
    <div className="flex flex-col gap-4">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: Array<{
            rsmKey: string;
            id: string;
            properties: { name: string };
          }> }) =>
            geographies.map((geo) => {
              const fips = String(geo.id).padStart(2, "0");
              const usps = FIPS_TO_USPS[fips];
              const count = usps ? byState.get(usps) ?? 0 : 0;
              const fill = count > 0 ? colorScale(count) : "#eef0f3";
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#f26a42", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                >
                  <title>
                    {geo.properties.name}: {count} lender{count === 1 ? "" : "s"}
                  </title>
                </Geography>
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {rows.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 md:grid-cols-6">
          {rows.map((r) => (
            <div
              key={r.state}
              className="flex items-center justify-between rounded-md border px-3 py-1.5"
            >
              <span className="text-muted-foreground">{r.state}</span>
              <span className="font-medium tabular-nums">{r.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No lenders with mappable state data yet.
        </p>
      )}
    </div>
  );
}
