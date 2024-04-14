import * as fs from "fs";
import * as readline from "readline";
import { Pokemon, EvolutionChain } from "./interfaces";

const JSON_FILE_PATH = "pokemon.json";
const data: Pokemon[] = JSON.parse(fs.readFileSync(JSON_FILE_PATH, "utf-8"));

function viewAllData() {
  console.log("All Data:");
  data.forEach((item: Pokemon) => {
    console.log(`- ${item.name} (${item.id})`);
  });
}

function filterByID(id: string) {
  const filteredPokemon = data.find(
    (pokemon: Pokemon) => pokemon.id === parseInt(id)
  );
  if (filteredPokemon) {
    console.log(`- ${filteredPokemon.name} (${filteredPokemon.id})`);
    console.log(`  - Description: ${filteredPokemon.description}`);
    console.log(`  - Height: ${filteredPokemon.height}`);
    console.log(`  - Weight: ${filteredPokemon.weight}`);
    console.log(`  - Is Legendary: ${filteredPokemon.isLegendary}`);
    console.log(`  - Birthdate: ${filteredPokemon.birthdate}`);
    console.log(`  - Image URL: ${filteredPokemon.imageUrl}`);
    console.log(`  - Type: ${filteredPokemon.type}`);
    console.log(`  - Abilities: ${filteredPokemon.abilities.join(", ")}`);
    console.log(
      `  - Evolution Chain: ${filteredPokemon.evolutionChain.baseForm} -> ${filteredPokemon.evolutionChain.evolvesTo} -> ${filteredPokemon.evolutionChain.finalForm}`
    );
  } else {
    console.log(`No data found for ID ${id}`);
  }
}
function displayOverviewPage() {
  console.log("Overview Page:");
  console.log("ID | Name | Height | Weight | Is Legendary");
  data.forEach((pokemon: Pokemon) => {
    console.log(
      `${pokemon.id} | ${pokemon.name} | ${pokemon.height} | ${
        pokemon.weight
      } | ${pokemon.isLegendary ? "Yes" : "No"}`
    );
  });
}

function main() {
  console.log("Welcome to the JSON data viewer!\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("1. View all data");
  console.log("2. Filter by ID");
  console.log("3. Exit");
  console.log("4. Display Overview Page");

  rl.question("Please enter your choice: ", (choice) => {
    if (choice === "1") {
      viewAllData();
      rl.close();
    } else if (choice === "2") {
      rl.question("Please enter the ID you want to filter by: ", (id) => {
        filterByID(id);
        rl.close();
      });
    } else if (choice === "3") {
      console.log("Exiting...");
      rl.close();
    } else if (choice === "4") {
      displayOverviewPage();
      rl.close();
    } else {
      console.log("Invalid choice. Please try again.");
      rl.close();
    }
  });
}

main();
