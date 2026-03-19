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
}

interface AutocompleteOption {
  value: string;
  label: ReactNode;
  species: Species;
}

let scrollContainerInitially = true;

const SpeciesDropdown = ({
  selectedSpecies,
  onChangeSpecies,
  onSpeciesLabelsChange,
  speciesColors,
}: Props) => {
  const [searchValue, setSearchValue] = useState("");
  const [customSpecies, setCustomSpecies] = useState<Species | null>(null);
  const collapseRef = useRef<HTMLDivElement | null>(null);
  const { availability, loading: loadingAvailability } =
    useAvailableSpecies(selectedSpecies);

  const { data, loading } = useQuery(GET_SPECIES, {
    fetchPolicy: "cache-and-network",
  });

  const [searchSpecies, { data: searchData, loading: loadingSearch }] =
    useLazyQuery(SEARCH_SPECIES, {
      fetchPolicy: "cache-and-network",
    });

  const topThreeSpecies = useMemo(
    () => [data?.species1, data?.species2, data?.species3].filter(isNotNull),
    [data?.species1, data?.species2, data?.species3],
  );

  useEffect(() => {
    const labels: Record<string, string> = {};
    for (const s of topThreeSpecies) {
      if (selectedSpecies.includes(s.id)) {
        labels[s.id] = getTranslatedSpeciesName(s as Species);
      }
    }
    if (customSpecies && selectedSpecies.includes(customSpecies.id)) {
      labels[customSpecies.id] = getTranslatedSpeciesName(customSpecies);
    }
    onSpeciesLabelsChange(labels);
  }, [topThreeSpecies, customSpecies, selectedSpecies, onSpeciesLabelsChange]);

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
  }, [searchData, selectedSpecies, availability]);

  const onSelectSearch = (_value: string, option: AutocompleteOption) => {
    if (customSpecies !== null) {
      // if there is a previous custom species, remove that from the selected
      // array and add the new species
      onChangeSpecies([
        ...selectedSpecies.filter((s) => s !== customSpecies.id),
        option.species.id,
      ]);
    } else {
      onChangeSpecies([...selectedSpecies, option.species.id]);
    }
    setCustomSpecies(option.species);
    setSearchValue("");
    // scroll down with the useEffect below to notify user of success
    scrollContainerInitially = true;
  };

  const onClickSpecies = (id: string) => {
    if (selectedSpecies.includes(id)) {
      onChangeSpecies(selectedSpecies.filter((s) => s !== id));
    } else if (selectedSpecies.length < 4) {
      onChangeSpecies([...selectedSpecies, id]);
    }
  };

  useEffect(() => {
    if (customSpecies && collapseRef.current && scrollContainerInitially) {
      scrollContainerInitially = false;
      const container = collapseRef.current.querySelector(".ant-collapse-body");
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [collapseRef, customSpecies]);

  return (
    <Collapse
      collapsible="header"
      className="bg-light rounded-xs w-68 text-sm pointer-events-auto"
      ref={collapseRef}
      classNames={{ body: "max-h-96 overflow-auto", header: "border-b-0" }}
      defaultActiveKey={1}
      items={[
        {
          key: "1",
          label: <h2 className="text-base">Vogelarten</h2>,
          children: (
            <>
              <p className="mb-4">
                Wählen Sie bis zu 3 Arten aus oder suchen Sie nach einer 4. Art.
              </p>

              <Spin
                indicator={<LoadingOutlined />}
                spinning={loading || loadingAvailability}
                className="p-4"
              >
                <div className="my-4">
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
                </div>
                <ul className="list-none mb-4">
                  {topThreeSpecies.map((species) => (
                    <li key={species.scientificName} className="mb-4 last:mb-0">
                      <SpeciesItem
                        disabled={!availability[species.id]}
                        species={species as Species}
                        speciesColors={speciesColors}
                        isSelected={selectedSpecies.includes(species.id)}
                        onClickSpecies={onClickSpecies}
                      />
                    </li>
                  ))}
                </ul>

                {customSpecies && (
                  <SpeciesItem
                    species={customSpecies}
                    disabled={!availability[customSpecies.id]}
                    speciesColors={speciesColors}
                    isSelected={selectedSpecies.includes(customSpecies.id)}
                    onClickSpecies={(id) => {
                      // remove custom species as it has been deselected
                      onClickSpecies(id);
                      setCustomSpecies(null);
                    }}
                  />
                )}
              </Spin>
            </>
          ),
        },
      ]}
    />
  );
};

export default SpeciesDropdown;
