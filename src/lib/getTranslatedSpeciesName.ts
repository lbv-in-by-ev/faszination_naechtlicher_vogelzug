import type { Species } from "../gql/graphql.ts";

export function getTranslatedSpeciesName(species: Species, locale = "de"): string {
  return (
    species.translations.find((s) => s.locale === locale)?.commonName ??
    species.scientificName ??
    species.id
  );
}
