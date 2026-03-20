export const layers = [
  {
    id: "light-pollution-layer",
    type: "raster",
    source: "light-pollution",
    layout: {
      visibility: "none",
    },
    paint: {
      "raster-opacity": 0.3,
    },
  },
  {
    id: "lfu-laerm-strassen-lden-2022-layer",
    type: "raster",
    source: "lfu-laerm-strassen-lden-2022",
    layout: {
      visibility: "none",
    },
    paint: {
      "raster-opacity": 0.6,
    },
  },
  {
    id: "lfu-hauptstrassen-lden-2022-layer",
    type: "raster",
    source: "lfu-hauptstrassen-lden-2022",
    layout: {
      visibility: "none",
    },
    paint: { "raster-opacity": 0.6 },
  },
  {
    id: "detections-all-outer",
    type: "circle",
    source: "detections-all",
    layout: { visibility: "none" },
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "point_count"], 1],
        1,
        10,
        100,
        100,
      ],
      "circle-color": "#cccccc",
      "circle-opacity": 0.15,
    },
  },
  {
    id: "detections-all-inner",
    type: "circle",
    source: "detections-all",
    layout: { visibility: "none" },
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "point_count"], 1],
        1,
        10,
        100,
        100,
      ],
      "circle-color": "#cccccc",
      "circle-opacity": 0.2,
      "circle-blur": 1.5,
    },
  },
  {
    id: "cluster-glow-outer",
    type: "circle",
    source: "detections-aggregated",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "point_count"], 1],
        1,
        10,
        100,
        100,
      ],
      "circle-color": "#cccccc",
      "circle-opacity": 0.4,
    },
  },

  {
    id: "cluster-glow-inner",
    type: "circle",
    source: "detections-aggregated",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "point_count"], 1],
        1,
        10,
        100,
        100,
      ],
      "circle-color": "#cccccc",
      "circle-opacity": 0.5,
      "circle-blur": 1.5,
    },
  },
];
