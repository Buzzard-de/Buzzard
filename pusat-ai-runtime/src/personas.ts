import type { PersonaConfig } from "./types.js";

export const PERSONAS: Record<string, PersonaConfig> = {
  DE: { personaId: "de-suzan", countryCode: "DE", locale: "de-DE", language: "de", displayName: "Suzan", voiceId: "de-default", formality: .55, empathy: .85, speechRate: 1, disclosureRequired: true },
  GB: { personaId: "gb-simone", countryCode: "GB", locale: "en-GB", language: "en", displayName: "Simone", voiceId: "en-gb-default", formality: .5, empathy: .85, speechRate: 1, disclosureRequired: true },
  FR: { personaId: "fr-camille", countryCode: "FR", locale: "fr-FR", language: "fr", displayName: "Camille", voiceId: "fr-default", formality: .55, empathy: .85, speechRate: 1, disclosureRequired: true },
  ES: { personaId: "es-lucia", countryCode: "ES", locale: "es-ES", language: "es", displayName: "Lucia", voiceId: "es-default", formality: .5, empathy: .9, speechRate: 1, disclosureRequired: true },
  IT: { personaId: "it-giulia", countryCode: "IT", locale: "it-IT", language: "it", displayName: "Giulia", voiceId: "it-default", formality: .5, empathy: .9, speechRate: 1, disclosureRequired: true },
  GR: { personaId: "gr-eleni", countryCode: "GR", locale: "el-GR", language: "el", displayName: "Eleni", voiceId: "el-default", formality: .55, empathy: .9, speechRate: 1, disclosureRequired: true },
  TR: { personaId: "tr-asli", countryCode: "TR", locale: "tr-TR", language: "tr", displayName: "Aslı", voiceId: "tr-default", formality: .45, empathy: .9, speechRate: 1, disclosureRequired: true },
  PL: { personaId: "pl-anna", countryCode: "PL", locale: "pl-PL", language: "pl", displayName: "Anna", voiceId: "pl-default", formality: .5, empathy: .88, speechRate: 1, disclosureRequired: true },
  CH: { personaId: "ch-nina", countryCode: "CH", locale: "de-CH", language: "de", displayName: "Nina", voiceId: "de-ch-default", formality: .6, empathy: .85, speechRate: 1, disclosureRequired: true }
};

export function getPersona(countryCode: string): PersonaConfig {
  const persona = PERSONAS[countryCode.toUpperCase()];
  if (!persona) throw new Error(`PERSONA_NOT_CONFIGURED:${countryCode}`);
  return persona;
}