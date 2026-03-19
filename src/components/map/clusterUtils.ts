import Supercluster, { type AnyProps, type PointFeature } from "supercluster";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { DetectionItemFragment } from "../../gql/graphql.ts";

export const detectionsToFeatures = (
  detections: DetectionItemFragment[],
): Feature<Point>[] => {
  return detections.map((d) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [d.coords.lon, d.coords.lat],
    },
    properties: {
      id: d.id,
      species: d.species.id,
    },
  }));
};

// Deduplicates detections to one point per unique location.
// When multiple species appear at the same spot, the dominant (most frequent) one wins.
export const detectionsToUniqueLocations = (
  detections: DetectionItemFragment[],
): FeatureCollection<Point> => {
  const locationMap = new Map<
    string,
    { lat: number; lon: number; speciesCounts: Map<string, number> }
  >();

  for (const d of detections) {
    const key = `${d.coords.lat.toFixed(6)},${d.coords.lon.toFixed(6)}`;
    let loc = locationMap.get(key);
    if (!loc) {
      loc = { lat: d.coords.lat, lon: d.coords.lon, speciesCounts: new Map() };
      locationMap.set(key, loc);
    }
    loc.speciesCounts.set(
      d.species.id,
      (loc.speciesCounts.get(d.species.id) ?? 0) + 1,
    );
  }

  const features: Feature<Point>[] = [...locationMap.values()].map(
    ({ lat, lon, speciesCounts }) => {
      let dominantSpecies = "";
      let maxCount = 0;
      speciesCounts.forEach((count, species) => {
        if (count > maxCount) {
          maxCount = count;
          dominantSpecies = species;
        }
      });
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { species: dominantSpecies },
      };
    },
  );

  return { type: "FeatureCollection", features };
};

// Creates an index for each species
export const createSuperclusterIndices = (features: Feature<Point>[]) => {
  const indices: Record<string, Supercluster> = {};

  const uniqueSpecies = [
    ...new Set(features.map((f) => f.properties?.species as string)),
  ];

  uniqueSpecies.forEach((species) => {
    const index = new Supercluster({
      radius: 80,
      maxZoom: 14,
      minZoom: 0,
    });

    const speciesFeatures = features.filter(
      (f) => f.properties?.species === species,
    );
    index.load(speciesFeatures as PointFeature<AnyProps>[]);

    indices[species] = index;
  });

  return indices;
};

export const getCombinedClusters = (
  indices: Record<string, Supercluster>,
  bounds: [number, number, number, number],
  zoom: number,
): Feature<Point>[] => {
  let combined: Feature<Point>[] = [];

  Object.keys(indices).forEach((species) => {
    const index = indices[species];
    const results = index.getClusters(bounds, zoom);

    const taggedResults = results.map((f) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Supercluster can return null properties at runtime
      if (!f.properties) f.properties = {};
      f.properties.species = species;
      return f as Feature<Point>;
    });

    combined = [...combined, ...taggedResults];
  });

  return combined;
};
