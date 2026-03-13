import React, { useRef, useEffect, useMemo, useCallback } from "react";
import maplibregl, {
  type AddLayerObject,
  GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import Supercluster from "supercluster";
// MapLibre CSS is imported inline in main.tsx and injected into shadow DOM
import { createRoot } from "react-dom/client";

import {
  detectionsToFeatures,
  createSuperclusterIndices,
  getCombinedClusters,
} from "./clusterUtils";
import { layers } from "./mapStyles";
import type { DetectionItemFragment } from "../../gql/graphql.ts";
import { buildColorExpression } from "./colorUtils.ts";
import { getDayPolygon } from "../../lib/getDayPolygon.ts";
import { useDatesContext } from "../DatesProvider.tsx";
import { useMapContext } from "../MapProvider.tsx";
import { INFO_POINTS } from "./infopoints.ts";
import { InfoPopup } from "../InfoPopup.tsx";
import { SHOW_DEMO_INFOPOINTS } from "../../config.ts";

const bounds: LngLatBoundsLike = [11.94746, 48.957566, 12.274475, 49.060145];

const MARKER_CLASSES = `
  size-5
  bg-[#00FFCC] 
  outline-2 outline-solid outline-offset-2 outline-[#00FFCC] 
  rounded-full 
  text-black 
  flex items-center justify-center 
  font-sans font-bold text-base 
  cursor-pointer 
  transition-all duration-200 ease-out
  hover:shadow-[0_0_15px_rgba(0,210,211,0.8)]
  hover:brightness-110
`;

interface MapProps {
  detections?: DetectionItemFragment[];
  selectedSpecies: string[];
  speciesColors: Record<string, string>;
}

const Map: React.FC<MapProps> = ({
  detections,
  selectedSpecies,
  speciesColors,
}) => {
  const { visualisationTimeRange } = useDatesContext();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const clusterIndices = useRef<Record<string, Supercluster>>({});
  const fromDate = visualisationTimeRange.from.toDate();
  const { setMap } = useMapContext();
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<maplibregl.Popup[]>([]);

  const updateMapSource = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource<GeoJSONSource>("detections-aggregated");
    if (!source) return;

    const bounds = map.getBounds().toArray().flat() as [
      number,
      number,
      number,
      number,
    ];
    const zoom = Math.round(map.getZoom());
    const features = getCombinedClusters(clusterIndices.current, bounds, zoom);

    source.setData({
      type: "FeatureCollection",
      features: features,
    });
  }, []);

  const updateLayerColors = useCallback(() => {
    const map = mapRef.current;
    if (!map || !detections) return;
    if (!map.getLayer("cluster-glow-outer")) return;

    const paintExpression = buildColorExpression(
      selectedSpecies,
      speciesColors,
    );
    map.setPaintProperty("cluster-glow-outer", "circle-color", paintExpression);
    map.setPaintProperty("cluster-glow-inner", "circle-color", paintExpression);
  }, [detections, selectedSpecies, speciesColors]);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const _map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles-eu.stadiamaps.com/styles/alidade_smooth_dark.json",
      bounds,
      maplibreLogo: false,
    });

    _map.on("load", () => {
      _map.addSource("detections-aggregated", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      _map.addSource("light-pollution", {
        type: "image",
        url: `${import.meta.env.BASE_URL}map-overlays/lp.png`,
        coordinates: [
          [-32, 75],
          [70, 75],
          [70, 34],
          [-32, 34],
        ],
      });

      _map.addSource("lfu-laerm-strassen-lden-2022", {
        type: "raster",
        tiles: [
          "https://www.lfu.bayern.de/gdi/wms/laerm/ballungsraeume?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:3857&STYLES=&LAYERS=aggmroadln2022,aggmroadlden2022,aggroadlden2022,aggroadln2022,aggindlden2022,aggindln2022,aggraillden2022,aggrailln2022&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",
        ],
        tileSize: 256,
      });

      _map.addSource("lfu-hauptstrassen-lden-2022", {
        type: "raster",
        tiles: [
          "https://www.lfu.bayern.de/gdi/wms/laerm/hauptverkehrsstrassen?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:3857&STYLES=&LAYERS=mroadbyln2022,lsemroadby2022,mroadbylden2022&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",
        ],
        tileSize: 256,
      });

      layers.forEach((layer) => _map.addLayer(layer as AddLayerObject));

      mapRef.current = _map;
      setMap(_map);

      updateMapSource();
      updateLayerColors();

      // Ensure MapLibre recalculates container size after flex layout settles
      requestAnimationFrame(() => _map.resize());
    });

    _map.on("moveend", updateMapSource);

    return () => {
      _map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature flag
    if (!map || !SHOW_DEMO_INFOPOINTS) return;

    markersRef.current.forEach((m) => m.remove());
    popupsRef.current.forEach((p) => p.remove());
    markersRef.current = [];
    popupsRef.current = [];

    INFO_POINTS.forEach((point) => {
      const el = document.createElement("div");
      el.className = MARKER_CLASSES;
      el.innerText = "i";

      const popupContainer = document.createElement("div");

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        maxWidth: "none",
      }).setDOMContent(popupContainer);

      const root = createRoot(popupContainer);

      el.onclick = (e) => {
        e.stopPropagation();

        popupsRef.current.forEach((p) => {
          if (p !== popup) p.remove();
        });

        if (popup.isOpen()) {
          popup.remove();
        } else {
          popup.setLngLat([point.lng, point.lat]).addTo(map);

          root.render(<InfoPopup {...point} onClose={() => popup.remove()} />);
        }
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(map);

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      popupsRef.current.forEach((p) => p.remove());
    };
  }, [mapRef.current]);

  const dayPolygon = useMemo(() => getDayPolygon(fromDate), [fromDate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "daylight-source";
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: dayPolygon });
      map.addLayer(
        {
          id: "daylight-layer",
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": 0.08,
            "fill-antialias": false,
          },
        },
        "cluster-glow-inner",
      );
    } else {
      map.getSource<GeoJSONSource>(sourceId)?.setData(dayPolygon);
    }
  }, [dayPolygon]);

  useEffect(() => {
    if (!detections) return;
    const features = detectionsToFeatures(detections);
    clusterIndices.current = createSuperclusterIndices(features);
    updateMapSource();
    updateLayerColors();
  }, [detections, updateMapSource, updateLayerColors]);

  useEffect(() => {
    updateLayerColors();
  }, [selectedSpecies, speciesColors, updateLayerColors]);

  return (
    <div
      className="map-container flex-1 min-h-0"
      ref={mapContainer}
      data-testid="map-container"
    />
  );
};

export default Map;
