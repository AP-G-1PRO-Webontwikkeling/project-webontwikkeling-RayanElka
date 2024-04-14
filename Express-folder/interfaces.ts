export interface Pokemon {
    id: number;
    name: string;
    description: string;
    height: number;
    weight: number;
    isLegendary: boolean;
    birthdate: string;
    imageUrl: string;
    type: string;
    abilities: string[];
    evolutionChain: EvolutionChain;
}

export interface EvolutionChain {
    id: number;
    baseForm: string;
    evolvesTo: string;
    finalForm: string;
}
