export const CURRENTS_PROMPTS = [
  { key: "loving", label: "Loving" },
  { key: "drinking", label: "Drinking" },
  { key: "wanting", label: "Wanting" },
  { key: "loathing", label: "Loathing" },
  { key: "eating", label: "Eating" },
  { key: "needing", label: "Needing" },
  { key: "making", label: "Making" },
  { key: "thinking", label: "Thinking" },
  { key: "wishing", label: "Wishing" },
] as const;

export type CurrentsPromptKey = (typeof CURRENTS_PROMPTS)[number]["key"];

export const CURRENTS_MAX_PHOTOS = 4;

export type CurrentsPromptsMap = Record<CurrentsPromptKey, string>;

export function emptyCurrentsPrompts(): CurrentsPromptsMap {
  return {
    loving: "",
    drinking: "",
    wanting: "",
    loathing: "",
    eating: "",
    needing: "",
    making: "",
    thinking: "",
    wishing: "",
  };
}