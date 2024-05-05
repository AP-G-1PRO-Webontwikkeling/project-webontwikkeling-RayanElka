import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Pokemon } from './interfaces';
import { MongoClient } from 'mongodb';


const app = express();
const PORT = 3000;

async function readPokemonData(): Promise<Pokemon[]> {
  try {
    const pokemonDataPath = path.join(__dirname, 'pokemon.json');
    const rawData = await fs.promises.readFile(pokemonDataPath, 'utf-8');
    return JSON.parse(rawData) as Pokemon[];
  } catch (error) {
    console.error(`Error lezen pokemon data: ${error}`);
    return [];
  }
}

 app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.get('/', async (req: Request, res: Response) => {
  const data = await readPokemonData();
  res.render('index', { data });
});




app.get("/pokemon/filter", async (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name) {
    res.status(400).send("Invalid query");
    return;
  }

  const data = await readPokemonData();
  const filteredData = data.filter(pokemon =>
    typeof pokemon.name === 'string' && pokemon.name.toLowerCase().includes(name.toLowerCase())
  );
  res.render('index', { data: filteredData });
});

app.get("/pokemon/sort", async (req: Request, res: Response) => {
  const field = req.query.field as string;
  const order = req.query.order as string;

  if (!field || !order) {
    res.status(400).send("geen field of order query parameters");
    return;
  }

  const data = await readPokemonData();

  if (!data.some(p => field in p)) {
    res.status(400).send("Invalid field gespicifierd");
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const fieldA = String(a[field]).toLowerCase();
    const fieldB = String(b[field]).toLowerCase();
    return order === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
  });

  res.render('index', { data: sortedData });
});
app.get('/pokemon/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const data = await readPokemonData();
  const pokemon = data.find(p => p.id === Number(id));
  if (!pokemon) {
    res.status(404).send("Pokemon niet gevonden");
    return;
  }
  res.render('pokemonDetail', { pokemon });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});