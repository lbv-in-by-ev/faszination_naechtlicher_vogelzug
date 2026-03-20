import { CloseOutlined } from "@ant-design/icons";
import { getTranslatedSpeciesName } from "../lib/getTranslatedSpeciesName.ts";
import type { Species } from "../gql/graphql.ts";

interface Props {
  species: Species;
  speciesColors: Record<string, string>;
  onRemove: () => void;
  disabled: boolean;
}

const SpeciesItem = ({
  species,
  speciesColors,
  onRemove,
  disabled,
}: Props) => {
  const borderColor = speciesColors[species.id] || "transparent";

  return (
    <div className={`bg-primary-darker text-white ${disabled ? "opacity-30" : ""}`}>
      <button
        type="button"
        className="flex items-center text-left cursor-pointer w-full"
        onClick={onRemove}
      >
        <div
          className="border-r-3 min-w-0 shrink-0"
          style={{ borderRightColor: borderColor }}
        >
          {species.imageUrl && (
            <img
              src={species.imageUrl}
              alt=""
              className="size-16 object-cover aspect-square"
            />
          )}
        </div>
        <div className="flex-1 font-medium ml-4">
          {getTranslatedSpeciesName(species)}
        </div>
        <CloseOutlined className="px-4 text-white/60 hover:text-white" />
      </button>
    </div>
  );
};

export default SpeciesItem;
