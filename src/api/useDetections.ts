import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { GET_DETECTIONS } from "./queries.ts";
import type { InputLocation } from "../gql/graphql.ts";
import { useQuery } from "@apollo/client/react";
import { isNotNull } from "../lib/isNotNull.ts";
import { useDatesContext } from "../components/DatesProvider.tsx";
import { useMapContext } from "../components/MapProvider.tsx";

const BATCH_SIZE = 20000;
const toIso = (d: dayjs.Dayjs) => d.startOf("minute").toISOString();

interface Bounds {
  ne: InputLocation;
  sw: InputLocation;
}

function isContained(viewport: Bounds, fetched: Bounds): boolean {
  return (
    viewport.sw.lat >= fetched.sw.lat &&
    viewport.sw.lon >= fetched.sw.lon &&
    viewport.ne.lat <= fetched.ne.lat &&
    viewport.ne.lon <= fetched.ne.lon
  );
}

function padBounds(viewport: Bounds, factor = 0.5): Bounds {
  const latSpan = viewport.ne.lat - viewport.sw.lat;
  const lonSpan = viewport.ne.lon - viewport.sw.lon;
  return {
    sw: {
      lat: Math.max(-90, viewport.sw.lat - latSpan * factor),
      lon: Math.max(-180, viewport.sw.lon - lonSpan * factor),
    },
    ne: {
      lat: Math.min(90, viewport.ne.lat + latSpan * factor),
      lon: Math.min(180, viewport.ne.lon + lonSpan * factor),
    },
  };
}

export function useDetections(species: string[]) {
  const { map } = useMapContext();
  const { dateRange, visualisationTimeRange, isNightOnly, timeSegments } = useDatesContext();
  const fetchedBoundsRef = useRef<Bounds | null>(null);
  const [queryBounds, setQueryBounds] = useState<Bounds | null>(null);

  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      const b = map.getBounds();
      const viewport: Bounds = {
        ne: { lat: b.getNorthEast().lat, lon: b.getNorthEast().lng },
        sw: { lat: b.getSouthWest().lat, lon: b.getSouthWest().lng },
      };

      if (fetchedBoundsRef.current && isContained(viewport, fetchedBoundsRef.current)) {
        return;
      }

      const padded = padBounds(viewport);
      fetchedBoundsRef.current = padded;
      setQueryBounds(padded);
    };

    handleMoveEnd();
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map]);

  const fetchVariables = useMemo(
    () =>
      queryBounds
        ? {
            ...queryBounds,
            period: {
              from: toIso(dateRange.from),
              to: toIso(dateRange.to),
            },
            first: BATCH_SIZE,
            species: [...species].sort(),
          }
        : null,
    [
      queryBounds?.ne.lat,
      queryBounds?.ne.lon,
      queryBounds?.sw.lat,
      queryBounds?.sw.lon,
      dateRange.from.valueOf(),
      dateRange.to.valueOf(),
      species.join(","),
    ],
  );

  const { data, previousData, loading, error, client } = useQuery(GET_DETECTIONS, {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- skip guarantees fetchVariables is non-null when query runs
    variables: fetchVariables!,
    skip: species.length === 0 || fetchVariables === null,
    notifyOnNetworkStatusChange: false,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;

  const allDetections = useMemo(() => {
    if (!effectiveData?.detections.nodes) return [];
    const nodes = effectiveData.detections.nodes.filter(isNotNull);
    if (!isNightOnly) return nodes;
    return nodes.filter((detection) => {
      const t = dayjs(detection.timestamp);
      return timeSegments.some(
        (seg) => t.isSameOrAfter(seg.start) && t.isBefore(seg.end),
      );
    });
  }, [effectiveData, isNightOnly, timeSegments]);

  const activeDetections = useMemo(() => {
    return allDetections.filter((detection) => {
      const detectionTime = dayjs(detection.timestamp);
      return (
        detectionTime.isSameOrAfter(visualisationTimeRange.from) &&
        detectionTime.isBefore(visualisationTimeRange.to)
      );
    });
  }, [allDetections, visualisationTimeRange.from.valueOf(), visualisationTimeRange.to.valueOf()]);

  const prefetch = (vars?: {
    period?: { from: dayjs.Dayjs; to: dayjs.Dayjs };
  }) => {
    if (!vars?.period || !fetchVariables) return;

    const prefetchVars = {
      ...fetchVariables,
      period: {
        from: toIso(vars.period.from.startOf("day")),
        to: toIso(vars.period.from.endOf("day")),
      },
    };

    client
      .query({
        query: GET_DETECTIONS,
        variables: prefetchVars,
        fetchPolicy: "cache-first",
      })
      .catch(console.error);
  };

  return {
    allDetections,
    activeDetections,
    loading,
    error,
    prefetch,
  };
}
