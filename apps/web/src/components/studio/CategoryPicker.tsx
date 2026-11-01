"use client";

import Icon from "@/components/ui/Icon";
import { IDEA_CATEGORIES, type IdeaCategoryKey } from "@/lib/client/idea-categories";

const SELECTED_STYLE = "bg-secondary-fixed/30 border-secondary shadow-md";
const UNSELECTED_STYLE =
  "bg-surface-container-lowest border-outline-variant/40 hover:border-secondary/40 shadow-sm";

interface CategoryPickerProps {
  selected: IdeaCategoryKey | null;
  onSelect: (key: IdeaCategoryKey) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <section aria-labelledby="category-heading">
      <h2 id="category-heading" className="font-title-md text-title-md text-primary mb-2">
        1. Choose a category
      </h2>
      <ul className="grid grid-cols-2 gap-2.5">
        {IDEA_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.key;
          return (
            <li key={cat.key}>
              <button
                type="button"
                onClick={() => onSelect(cat.key)}
                aria-pressed={isSelected}
                className={`w-full h-full min-h-[44px] p-4 rounded-xl border text-left transition-all active:scale-95 ${
                  isSelected ? SELECTED_STYLE : UNSELECTED_STYLE
                }`}
              >
                <Icon
                  name={isSelected ? "check_circle" : cat.icon}
                  className={`text-[24px] mb-2 block ${isSelected ? "text-secondary" : "text-on-surface-variant"}`}
                  filled={isSelected}
                />
                <span className="font-title-md text-body-md font-semibold text-primary block">
                  {cat.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
