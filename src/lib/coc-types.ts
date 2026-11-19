/** Stored COC type values (the printout switches on these exact strings). */
export const COC_TYPES = ["Final", "Pressure", "Spray Painting", "Welding"] as const;
export type CocType = (typeof COC_TYPES)[number];
