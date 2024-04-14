const express = require("express");
const fs = require("fs");
const app = express();
const port = 3000;

// Lees en parse de data eenmalig bij het opstarten van de server
let data;
try {
  const fileData = fs.readFileSync("pokemon.json", "utf-8");
  data = JSON.parse(fileData);
} catch (error) {
  console.error("Fout bij het lezen van het bestand:", error);
  process.exit(1);
}

// Route voor de overzichtspagina
app.get("/", (req, res) => {
  let html = "<h1>Overview Page</h1>";
  html += "<table>";
  html +=
    "<tr><th>ID</th><th>Name</th><th>Height</th><th>Weight</th><th>Is Legendary</th></tr>";
  data.forEach((pokemon) => {
    html += `<tr><td>${pokemon.id}</td><td>${pokemon.name}</td><td>${
      pokemon.height
    }</td><td>${pokemon.weight}</td><td>${
      pokemon.isLegendary ? "Yes" : "No"
    }</td></tr>`;
  });
  html += "</table>";
  res.send(html);
});

// Route voor individuele Pokémon details
app.get("/pokemon/:id", (req, res) => {
  const pokemonId = parseInt(req.params.id);
  const pokemon = data.find((p) => p.id === pokemonId);
  if (pokemon) {
    res.send(
      `<h1>${pokemon.name}</h1>
       <p>ID: ${pokemon.id}</p>
       <p>Height: ${pokemon.height}</p>
       <p>Weight: ${pokemon.weight}</p>
       <p>Is Legendary: ${pokemon.isLegendary ? "Yes" : "No"}</p>`
    );
  } else {
    res.status(404).send("Pokemon not found");
  }
});

// Route voor het filteren van Pokémon op naam
app.get("/pokemon/filter", (req, res) => {
  const name = req.query.name.toLowerCase();
  const filteredPokemon = data.filter((pokemon) =>
    pokemon.name.toLowerCase().includes(name)
  );
  res.json(filteredPokemon);
});

// Route voor het sorteren van Pokémon
app.get("/pokemon/sort/:field/:order", (req, res) => {
  const { field, order } = req.params;
  const sortedPokemon = [...data].sort((a, b) => {
    if (order === "asc") {
      return a[field] > b[field] ? 1 : -1;
    } else if (order === "desc") {
      return a[field] < b[field] ? 1 : -1;
    }
    return 0;
  });
  res.json(sortedPokemon);
});

// Start de server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
