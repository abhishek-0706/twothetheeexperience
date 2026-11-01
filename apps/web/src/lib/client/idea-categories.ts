export const IDEA_CATEGORIES = [
  { key: "theme", label: "Themes & Colour Palettes", icon: "palette" },
  { key: "decor", label: "Decor & Florals", icon: "local_florist" },
  { key: "menu", label: "Menu & Cuisine", icon: "restaurant_menu" },
  { key: "entertainment", label: "Entertainment & Music", icon: "music_note" },
  { key: "invite_copy", label: "Invitation Wording", icon: "edit_note" },
  { key: "favors", label: "Guest Favours & Gifts", icon: "redeem" },
] as const;

export type IdeaCategoryKey = (typeof IDEA_CATEGORIES)[number]["key"];

export function ideaCategoryLabel(key: IdeaCategoryKey): string {
  return IDEA_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
