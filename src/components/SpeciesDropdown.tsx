import { useQuery, useLazyQuery } from "@apollo/client/react";
import { GET_SPECIES, SEARCH_SPECIES } from "../api/queries.ts";
import { Collapse, Spin, AutoComplete } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { isNotNull } from "../lib/isNotNull.ts";
import {
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  useRef,
  useEffect,
} from "react";
import { debounce } from "throttle-debounce";
import { hasNonNullProp } from "../lib/hasNonNullProp.ts";
import { getTranslatedSpeciesName } from "../lib/getTranslatedSpeciesName.ts";
import type { Species } from "../gql/graphql.ts";
import SpeciesItem from "./SpeciesItem.tsx";
import useAvailableSpecies from "./useAvailableSpecies.ts";

interface Props {
  selectedSpecies: string[];
  onChangeSpecies: (species: string[]) => void;
  onSpeciesLabelsChange: (labels: Record<string, string>) => void;
  speciesColors: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AutocompleteOption {
  value: string;
  label: ReactNode;
  species: Species;
}

const MAX_SPECIES = 3;

const SpeciesDropdown = ({
  selectedSpecies,
  onChangeSpecies,
  onSpeciesLabelsChange,
  speciesColors,
  open,
  onOpenChange,
}: Props) => {
  const [searchValue, setSearchValue] = useState("");
  const [speciesMap, setSpeciesMap] = useState<Record<string, Species>>({});
  const initializedRef = useRef(false);
  const { availability, loading: loadingAvailability } =
    useAvailableSpecies(selectedSpecies);

  const { data, loading } = useQuery(GET_SPECIES, {
    fetchPolicy: "cache-and-network",
  });

  const [searchSpecies, { data: searchData, loading: loadingSearch }] =
    useLazyQuery(SEARCH_SPECIES, {
      fetchPolicy: "cache-and-network",
    });

  // Auto-select hardcoded species on initial load
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      const initial = [data.species1, data.species2, data.species3].filter(
        isNotNull,
      );
      const map: Record<string, Species> = {};
      const ids: string[] = [];
      for (const s of initial) {
        map[s.id] = s as Species;
        ids.push(s.id);
      }
      setSpeciesMap((prev) => ({ ...prev, ...map }));
      onChangeSpecies(ids);
    }
  }, [data, onChangeSpecies]);

  // Update labels when selection or species data changes
  useEffect(() => {
    const labels: Record<string, string> = {};
    for (const id of selectedSpecies) {
      const species = speciesMap[id];
      if (species) {
        labels[id] = getTranslatedSpeciesName(species);
      }
    }
    onSpeciesLabelsChange(labels);
  }, [speciesMap, selectedSpecies, onSpeciesLabelsChange]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(300, (query: string) => {
      if (query.length >= 2) {
        searchSpecies({
          variables: {
            query,
            searchLocale: "de",
          },
        }).catch(console.error);
      }
    }),
    [searchSpecies],
  );

  const handleSearch = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const searchOptions: AutocompleteOption[] = useMemo(() => {
    if (!searchData?.searchSpecies?.nodes) return [];

    return searchData.searchSpecies.nodes
      .filter(isNotNull)
      .filter((s) => !selectedSpecies.includes(s.id))
      .filter((s) => hasNonNullProp(s, "imageUrl"))
      .slice(0, 10)
      .map((s) => ({
        value: s.id,
        label: (
          <div className="flex items-center gap-2">
            <img
              src={s.imageUrl}
              alt=""
              className="w-10 h-10 object-cover rounded"
            />
            <div className="flex-1">
              <div className="font-medium text-sm">
                {getTranslatedSpeciesName(s as Species)}
              </div>
            </div>
          </div>
        ),
        species: s as Species,
      }));
  }, [searchData, selectedSpecies]);

  const onSelectSearch = (_value: string, option: AutocompleteOption) => {
    if (selectedSpecies.length >= MAX_SPECIES) return;
    setSpeciesMap((prev) => ({ ...prev, [option.species.id]: option.species }));
    onChangeSpecies([...selectedSpecies, option.species.id]);
    setSearchValue("");
  };

  const onRemoveSpecies = (id: string) => {
    onChangeSpecies(selectedSpecies.filter((s) => s !== id));
  };

  const isMaxSelected = selectedSpecies.length >= MAX_SPECIES;

  return (
    <Collapse
      collapsible="header"
      className="bg-light rounded-xs w-68 text-sm pointer-events-auto"
      activeKey={open ? ["1"] : []}
      onChange={(keys) => { onOpenChange(keys.includes("1")); }}
      classNames={{ body: "max-h-[32rem] overflow-auto pb-4", header: "border-b-0" }}
      items={[
        {
          key: "1",
          label: <h2 className="text-base">Vogelarten</h2>,
          children: (
            <>
              <p className="mb-4">Wählen Sie bis zu drei Arten aus.</p>

              <Spin
                indicator={<LoadingOutlined />}
                spinning={loading || loadingAvailability}
                className="p-4"
              >
                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="searchSpecies"
                  >
                    Vogelart suchen
                  </label>
                  <AutoComplete
                    value={searchValue}
                    options={searchOptions}
                    onSelect={onSelectSearch}
                    onChange={handleSearch}
                    id="searchSpecies"
                    placeholder="Name eingeben..."
                    className="w-full"
                    disabled={isMaxSelected}
                    notFoundContent={
                      loadingSearch ? (
                        <div className="p-2 text-center">
                          <Spin size="small" />
                        </div>
                      ) : searchValue.length < 2 ? (
                        <div className="p-2 text-xs text-gray-500">
                          Mindestens 2 Zeichen eingeben.
                        </div>
                      ) : searchValue.length >= 2 &&
                        searchOptions.length === 0 ? (
                        <div className="p-2 text-xs text-gray-500">
                          Keine Ergebnisse gefunden.
                        </div>
                      ) : null
                    }
                  />
                  {isMaxSelected && (
                    <p className="mt-1 text-xs text-gray-500">
                      Entfernen Sie eine Art, um eine neue hinzuzufügen.
                    </p>
                  )}
                </div>

                <ul className="list-none mb-4">
                  {selectedSpecies.map((id) => {
                    const species = speciesMap[id];
                    if (!species) return null;
                    return (
                      <li key={id} className="mb-4 last:mb-0">
                        <SpeciesItem
                          species={species}
                          speciesColors={speciesColors}
                          onRemove={() => onRemoveSpecies(id)}
                          disabled={!availability[id]}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Spin>
            </>
          ),
        },
      ]}
    />
  );
};

export default SpeciesDropdown;
