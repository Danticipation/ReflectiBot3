// Voice Configuration for Reflectibot

export const defaultVoiceId = "iCrDUkL56s3C8sCRl7wb"; // Hope

export const baseVoices = [
  {
    name: "Hope",
    id: "iCrDUkL56s3C8sCRl7wb",
    description: "Warm, soothing, captivating American female",
    accent: "American",
    gender: "Female",
    default: true
  },
  {
    name: "Ophelia",
    id: "FA6HhUjVbervLw2rNl8M",
    description: "Calm, articulate British female",
    accent: "British",
    gender: "Female"
  },
  {
    name: "Adam",
    id: "NFG5qt843uXKj4pFvR7C",
    description: "Laid-back, late-night British male",
    accent: "British",
    gender: "Male"
  },
  {
    name: "Dan",
    id: "a4CnuaYbALRvW39mDitg",
    description: "Smooth, grounded American male",
    accent: "American",
    gender: "Male"
  }
];

export function getVoiceById(id: string) {
  return baseVoices.find((voice) => voice.id === id) || baseVoices[0];
}

export function getDefaultVoice() {
  return baseVoices.find((voice) => voice.default) || baseVoices[0];
}