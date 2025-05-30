export const baseVoices = [
  {
    id: "hope",
    name: "Hope",
    description: "Warm, soothing, meditative tone – default reflection voice.",
    elevenLabsId: "iCrDUkL56s3C8sCRl7wb",
  },
  {
    id: "ophelia",
    name: "Ophelia",
    description: "Calm British female voice, ideal for guided thoughts.",
    elevenLabsId: "FA6HhUjVbervLw2rNl8M",
  },
  {
    id: "adam",
    name: "Adam",
    description: "Deep male British voice with a late-night tone.",
    elevenLabsId: "NFG5qt843uXKj4pFvR7C",
  },
  {
    id: "dan",
    name: "Dan",
    description: "Confident American male, best for strong feedback or motivation.",
    elevenLabsId: "UbNxnLTc3wbMEeA9zhn5",
  },
];

export const defaultVoiceId = "hope";

export function getVoiceById(id: string) {
  return baseVoices.find((v) => v.id === id) || baseVoices[0];
}
